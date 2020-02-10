// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import ReactTooltip from "react-tooltip";
import "rc-slider/assets/index.css";
import Switch from "react-switch";
import { isMobile } from "react-device-detect";

// CUSTOM
import "./TOC.css";
import * as helpers from "../../../helpers/helpers";
import * as TOCHelpers from "../common/TOCHelpers.jsx";
import TOCConfig from "../common/TOCConfig.json";
import GroupItem from "./GroupItem.jsx";
import FloatingMenu, { FloatingMenuItem } from "../../../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../../../helpers/Portal.jsx";

class TOC extends Component {
  constructor(props) {
    super(props);
    this.storageMapDefaultsKey = "map_defaults";
    this.storageKey = "layers";
    this.state = {
      layerGroups: [],
      selectedGroup: {},
    
      saveLayerOptions:[],
      onMenuItemClick:[],
      isLoading: false,
      searchText: "",
      sortAlpha: this.getInitialSort(),
      defaultGroup: undefined,
      layerCount: 0
    };

    // LISTEN FOR SEARCH RESULT
    window.emitter.addListener("activeTocLayerGroup", (groupName, callback) => this.onActivateLayer(callback));
  }
  getInitialSort = () => {
    if (isMobile) return true;
    else return false;
  };
  onActivateLayer = (callback) => {
    window.emitter.emit("setSidebarVisiblity", "OPEN");
    window.emitter.emit("activateTab", "layers");  
    callback();
  };

  onLayersLoad = () => {
    if (window.allLayers !== undefined){
        let layerCount = 0;
        window.allLayers.map(group => {
          layerCount += group.length;
          });
      if (this.state.layerCount !== layerCount) this.setState({ layerCount: layerCount });
    }
  };


  componentDidMount() {
    this.refreshTOC();
    
  }

  refreshTOC = callback => {
      sessionStorage.removeItem(this.storageMapDefaultsKey); 
      let geoserverUrl= helpers.getURLParameter("GEO_URL");
      let geoserverUrlType = helpers.getURLParameter("GEO_TYPE");
      if (geoserverUrl === null) 
      {
        geoserverUrl = TOCConfig.geoserverLayerGroupsUrl;
      }
      else
      {
          geoserverUrl = geoserverUrl + "/ows?service=wms&version=1.3.0&request=GetCapabilities";
      }
      if (geoserverUrlType === null) geoserverUrlType = TOCConfig.geoserverLayerGroupsUrlType;
      if (geoserverUrl !== undefined && geoserverUrl !== null){
        TOCHelpers.getGroupsGC(geoserverUrl,geoserverUrlType ,result => {
          const groupInfo = result;
          this.setState(
            {
              layerGroups: groupInfo[0],
              selectedGroup: groupInfo[1],
              defaultGroup: groupInfo[1]
            },
            () => {
              if (callback !== undefined) callback();
            }
          );
          let allLayers = [];
          this.state.layerGroups.forEach(group =>{
            allLayers.push(group.layers);
          });
          window.allLayers = allLayers;
          this.onLayersLoad();
        });
      } else {
      const groupInfo = TOCHelpers.getGroups();
        this.setState(
          {
            layerGroups: groupInfo[0],
            selectedGroup: groupInfo[1],
            defaultGroup: groupInfo[1]
          },
          () => {
            if (callback !== undefined) callback();
          });
          window.allLayers = this.state.layerGroups;
          this.onLayersLoad();
      }
     
  };

  onGroupDropDownChange = selectedGroup => {
    this.setState({ selectedGroup: selectedGroup });
  };

  onSearchLayersChange = evt => {
    const searchText = evt.target.value;
    this.setState({ searchText: searchText });
  };

  reset = () => {
    
    const defaultGroup = this.state.defaultGroup;
    this.setState({ sortAlpha: false, selectedGroup: defaultGroup }, () => {
      this.refreshTOC(() => {
        setTimeout(() => {
          this.state.layerGroups.forEach(group => {
            window.emitter.emit("resetLayers", group.value);
          })
        }, 100);
      });
    });

    helpers.addAppStat("TOC Reset", "Button");
  };

  onToolsClick = evt => {
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu key={helpers.getUID()} buttonEvent={evtClone} item={this.props.info} onMenuItemClick={action => this.onMenuItemClick(action)} styleMode="right" yOffset={90}>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-expand">
            <FloatingMenuItem imageName={"plus16.png"} label="Expand Layers" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-collapse">
            <FloatingMenuItem imageName={"minus16.png"} label="Collapse Layers" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-visility">
            <FloatingMenuItem imageName={"layers-off.png"} label="Turn off Layers" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-legend">
            <FloatingMenuItem imageName={"legend16.png"} label="Show Legend" />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
  };

  onMenuItemClick = action => {
    if (action === "sc-floating-menu-expand") {
      window.emitter.emit("toggleAllLegend", "OPEN");
    } else if (action === "sc-floating-menu-collapse") {
      window.emitter.emit("toggleAllLegend", "CLOSE");
    } else if (action === "sc-floating-menu-legend") {
      helpers.showMessage("Legend", "Coming Soon");
    } else if (action === "sc-floating-menu-visility") {
      this.state.layerGroups.forEach(group => {
        window.emitter.emit("turnOffLayers", group.value);
       });
       window.emitter.emit("updateActiveTocLayers");
    }

    helpers.addAppStat("TOC Tools", action);
  };
  onSortSwitchChange = sortAlpha => {
    this.setState({ sortAlpha: sortAlpha });

    if (sortAlpha) {
      helpers.showMessage("Sorting", "Layer re-ordering disabled.", "yellow");
    }

    helpers.addAppStat("TOC Sort", sortAlpha);
  };
  onSaveClick = () => {
    this.saveLayerOptions();
  };


  saveLayerOptions = () => {
    // GATHER INFO TO SAVE
    let layers = {};
    for (var key in window.allLayers) {
      
      if (!window.allLayers.hasOwnProperty(key)) continue;

      var obj = window.allLayers[key];
      let savedLayers = {};
      let groupName = "";
      obj.forEach(layer => {
        groupName = layer.group;
        const saveLayer = {
          name: layer.name,
          visible: layer.visible
        };
        savedLayers[layer.name] = saveLayer;
      });

      layers[groupName] = savedLayers;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(layers));

    helpers.showMessage("Save", "Layer Visibility has been saved.");
  };

  render() {
    const groupsDropDownStyles = {
      control: provided => ({
        ...provided,
        minHeight: "30px"
      }),
      indicatorsContainer: provided => ({
        ...provided,
        height: "30px"
      }),
      clearIndicator: provided => ({
        ...provided,
        padding: "5px"
      }),
      dropdownIndicator: provided => ({
        ...provided,
        padding: "5px"
      })
    };
    return (
      <div>
        <div className={this.state.isLoading ? "sc-toc-main-container-loading" : "sc-toc-main-container-loading sc-hidden"}>
          <img className="sc-toc-loading" src={images["loading.gif"]} alt="loading" />
        </div>
        <div className={this.state.isLoading ? "sc-toc-main-container sc-hidden" : "sc-toc-main-container"}>
          <div className="sc-toc-search-container">
            <input id="sc-toc-search-textbox" className="sc-toc-search-textbox" placeholder={"Filter (" + this.state.layerCount + " layers)..."} onChange={this.onSearchLayersChange} />
            <div data-tip="Save Layer Visibility" data-for="sc-toc-save-tooltip" className="sc-toc-search-save-image" onClick={this.onSaveClick}>
              <ReactTooltip id="sc-toc-save-tooltip" className="sc-toc-save-tooltip" multiline={false} place="right" type="dark" effect="solid" />
            </div>
          </div>
        
          <div className="toc-group-list">
         { this.state.layerGroups.map((group) => (
              <GroupItem
                key={"group-item" + group.value}
                
                group={group}
                searchText={this.state.searchText}
                sortAlpha={this.state.sortAlpha}
                allGroups={this.state.layerGroups}
                panelOpen={this.state.selectedGroup.value === group.value}
                
                saveLayerOptions={this.state.saveLayerOptions[group.value]}

              />
              
          ))}
          </div>

          <div className="sc-toc-footer-container">
            <label className={this.state.sortAlpha ? "sc-toc-sort-switch-label on" : "sc-toc-sort-switch-label"}>
              Sort A-Z
              <Switch className="sc-toc-sort-switch" onChange={this.onSortSwitchChange} checked={this.state.sortAlpha} height={20} width={48} />
            </label>
            &nbsp;
            <button className="sc-button sc-toc-footer-button" onClick={this.reset}>
              Reset
            </button>
            &nbsp;
            <button className="sc-button sc-toc-footer-button tools" onClick={this.onToolsClick}>
              Additional Tools
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default TOC;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}