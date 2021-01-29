// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import { isMobile } from "react-device-detect";
import arrayMove from "array-move";

//OPEN LAYERS
import GeoJSON from "ol/format/GeoJSON.js";

//CUSTOM
import TOCConfig from "./common/TOCConfig.json";
import * as TOCHelpers from "./common/TOCHelpers.jsx";
import TOCHeader from "./common/TOCHeader.jsx";
import LayerOptionsMenu from "./common/LayerOptionsMenu.jsx";
import TOCListView from "./toc-list-view/TOCListView.jsx";
import TOCFolderView from "./toc-folder-view/TOCFolderView.jsx";
import * as helpers from "../../../helpers/helpers";

class TOC extends Component {
  constructor(props) {
    super(props);
    this.storageMapDefaultsKey = "Map Defaults";
    this.storageKeyAllLayers = "Saved Layers";
    this.storageKey = "Layers";
    this.storageKeyFolder = "Layers_Folder_View";
    this.storageKeyTOCType = "TOC_Type";


    this.state = {
      layerListGroups: [],
      layerFolderGroups: [],
      unusedPlaceholder: [],
      allLayers:[],
      saveLayerOptions:[],
      onMenuItemClick: [],
      type: this.props.type,
      defaultGroup: undefined,
      selectedGroup: {},
      layerCount: 0,
      sortFolderAlpha: this.getInitialSort(),
      sortListAlpha: this.getInitialSort(),

      searchText:"",
      isLoading:false,
    };
//#region ADD LISTENERS
    // LISTEN FOR MAP LEGEND
    window.emitter.addListener("openLegend", () => this.onOpenLegend());

    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());
    //LISTEN FOR NEW LAYER
    window.emitter.addListener("addCustomLayer", (layer, group, selected) => this.addCustomLayer(layer, group, selected));

    // LISTEN FOR LAYERS TO LOAD
    window.emitter.addListener("layersLoaded", (numLayers) => this.updateLayerCount(numLayers));

    // LISTEN FOR SEARCH RESULT
    window.emitter.addListener("activeTocLayerGroup", (groupName, callback) => this.onActivateLayerGroup(groupName, callback));
    window.emitter.addListener("activeTocLayer", (layerItem) => this.onActivateLayer(layerItem));

    // RETURN FULL LAYER LIST (replaces window.allLayers)
    window.emitter.addListener("getLayerList", (callback) => this.getLayerList(callback));
//#endregion
  }
 //#region REACT FUNCTIONS
  componentWillMount() {
    let tocType = helpers.getURLParameter("TOCTYPE");
    if (!tocType) tocType = helpers.getItemsFromStorage(this.storageKeyTOCType);
    if (tocType !== null && tocType !== undefined) {
      this.setState({ type: tocType });
    }
  }
//#endregion
//#region LOAD LAYERS
//HANDLE LAYER LOADING
onMapLoad = () => {
  this.refreshTOC(false, ()=> {
    if (!helpers.getConfigValue("leftClickIdentify")) {
      this.addPropertyReportClick();
    }
  });
};
refreshTOC = (isReset, callback=undefined) => {

  //Get saved layers
  //Get map config layers
  //Get toc config layers
  //Get toc config geoserver layers
  //combine and sort
  sessionStorage.removeItem(this.storageMapDefaultsKey);
  
  //TODO: Load layers that have been saved
  //let savedLayers = helpers.getItemsFromStorage(this.storageKeyAllLayers);
  //this.getSavedLayers((results)=>{savedLayers=results;});
  let geoserverUrl = helpers.getURLParameter("GEO_URL");
  let geoserverUrlType = helpers.getURLParameter("GEO_TYPE");
  let mapId = helpers.getURLParameter("MAP_ID");
  if (mapId === null) mapId = TOCConfig.mapId;
  if (geoserverUrl === null) {
    geoserverUrl = TOCConfig.geoserverLayerGroupsUrl;
  } else {
    geoserverUrl = geoserverUrl + "/ows?service=wms&version=1.3.0&request=GetCapabilities";
  }
  if (geoserverUrlType === null) geoserverUrlType = TOCConfig.geoserverLayerGroupsUrlType;
  if (geoserverUrl !== undefined && geoserverUrl !== null) {
    if(TOCConfig.useMapConfigApi){
      TOCHelpers.getMap(mapId, geoserverUrlType, isReset, this.state.type, (result)=>{
        const groupInfo = result;
        if (isReset) this.updateLayerVisibility("CLEAR");
        this.setState(
          {
            layerListGroups:  groupInfo[0],
            layerFolderGroups: TOCHelpers.copyTOCLayerGroups(groupInfo[0]),
            selectedGroup: groupInfo[1],
            defaultGroup: groupInfo[1],
          },
          () => {
            this.applySavedLayerOptions(this.state.type === "LIST"? "FOLDER" : "LIST"); //apply saved data for the opposite toc
            this.updateLayerCount(groupInfo[1].layers.length);
            this.updateLayerVisibility();
            window.emitter.emit("tocLoaded");
            if (callback !== undefined) callback();
          }
        );
      });
    }else{
      TOCHelpers.getGroupsGC(geoserverUrl, geoserverUrlType, isReset, this.state.type, false, true, (result) => {
        const groupInfo = result;
        if (isReset) this.updateLayerVisibility("CLEAR");

        this.setState(
          {
            layerListGroups:  groupInfo[0],
            layerFolderGroups: TOCHelpers.copyTOCLayerGroups(groupInfo[0]),
            selectedGroup: groupInfo[1],
            defaultGroup: groupInfo[1],
          },
          () => {
            this.applySavedLayerOptions(this.state.type === "LIST"? "FOLDER" : "LIST"); //apply saved data for the opposite toc
            this.updateLayerCount(groupInfo[1].layers.length);
            this.updateLayerVisibility();
            window.emitter.emit("tocLoaded");
            if (callback !== undefined) callback();
          }
        );
      });
    }
  } else {
    const groupInfo = TOCHelpers.getGroups();
    if (isReset) this.updateLayerVisibility("CLEAR");

    this.setState(
      {
        layerListGroups: groupInfo[0],
        layerFolderGroups: Object.assign([], groupInfo[0]),//TOCHelpers.copyTOCLayerGroups(groupInfo[0]),
        selectedGroup: groupInfo[1],
        defaultGroup: groupInfo[1],
      },
      () => {
        this.applySavedLayerOptions(this.state.type === "LIST"? "FOLDER" : "LIST"); //apply saved data for the opposite toc
        this.updateLayerCount(groupInfo[1].layers.length);
        this.updateLayerVisibility();
        window.emitter.emit("tocLoaded");
        if (callback !== undefined) callback();
      }
    );
  }
};

applySavedLayerOptions = (type) => {
  let savedData = helpers.getItemsFromStorage(type === "LIST" ? this.storageKey : this.storageKeyFolder);
  if (savedData === undefined) return;

  let layerGroups = Object.assign([],  type ==="LIST" ? this.state.layerListGroups : this.state.layerFolderGroups);
  layerGroups = layerGroups.map((group)=>{
    const savedGroup = savedData[group.value];
    let savedLayers = [];
    try{
      if (savedGroup !== undefined && savedGroup.layers !== undefined) {
        savedLayers = savedGroup.layers;
      }else if (savedGroup !== undefined){
        savedLayers = savedGroup; //Added to support legacy saves 
      }
    } catch (e){
      console.warn(e);
    }
    if (savedGroup.panelOpen !== undefined) group.panelOpen = savedGroup.panelOpen;
    group.layers = group.layers.map((layer)=>{
      const savedLayer = savedLayers[layer.name];
      if (savedLayer !== undefined) layer.visible = savedLayer.visible;
      if (savedLayer !== undefined) layer.opacity = savedLayer.opacity;
      return layer;
    });
    return group;
  });
  if (type === "LIST"){
    this.setState({layerListGroups: layerGroups});
  }else{
    this.setState({layerFolderGroups: layerGroups});
  }
}

getSavedLayers = (callback) => {
  let savedLayers = helpers.getItemsFromStorage(this.storageKeyAllLayers);
  if (savedLayers !== undefined && savedLayers !== null && savedLayers !== []) {
    TOCHelpers.getGroupsFromData(savedLayers, (result) => {
      const groupInfo = result;
      let groups = [];    
      groups = groups.concat(groupInfo[0]);
      callback(groups);
    });
  } else {
    callback([]);
  }
}
addCustomLayer = (layer, groupName, selected = false) => {
  const AddedMessage = (group, layer) => `New layer "${layer}" has been added to the "${group}" group.`;
  let layerIndex = 100;
  let layerGroups = this.getActiveLayerGroups();
  let layersGroup = layerGroups.filter((group) => group.value === groupName)[0];

  //if (layersGroup === undefined) layersGroup = layerGroups.filter((group) => group.label === this.myLayersGroupName)[0];
  if (layersGroup === undefined) layersGroup = layerGroups[0];

  layerIndex += layersGroup.layers.length + 1;
  TOCHelpers.makeLayer(layer.displayName, helpers.getUID(), layersGroup, layerIndex, true, 1, layer.layer, undefined, undefined, false, layer.styleUrl, (retLayer) => {
    let layers = layersGroup.layers;
    layers.unshift(retLayer);

    layersGroup.layers = layers;
    this.setLayerGroups(this.state.type,layerGroups.map((group) => (layersGroup.value === group.value ? layersGroup : group)), ()=>{
      this.forceUpdate();
      helpers.showMessage("Layer Added", AddedMessage(layersGroup.label, retLayer.displayName));
      if (selected) {
        window.emitter.emit("activeTocLayerGroup", layersGroup.value, () => {
          window.emitter.emit("activeTocLayer", {
            fullName: retLayer.name,
            name: retLayer.displayName,
            isVisible: retLayer.layer.getVisible(),
            layerGroupName: retLayer.groupName,
            layerGroup: retLayer.group,
            index: retLayer.index,
          });
          this.forceUpdate();
        });
      }
    });
  });
};

//#endregion
//#region HANDLE PROPERTY REPORT CLICK
addPropertyReportClick = () => {
  window.map.on("singleclick", (evt) => {
    const viewResolution = window.map.getView().getResolution();
    const allLayers = Object.assign([], this.state.allLayers);
    allLayers.forEach((layer) => {
      if (layer.visible && layer.liveLayer) {
        var url = layer.layer.getSource().getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", { INFO_FORMAT: "application/json" });
        if (url) {
          helpers.getJSON(url, (result) => {
            const features = result.features;
            if (features.length > 0) {
              const geoJSON = new GeoJSON().readFeatures(result);
              const feature = geoJSON[0];
              helpers.showFeaturePopup(evt.coordinate, feature);
            }
          });
        }
      }
    });
  });
};
//#endregion

//#region HANDLE LAYER STATES
acceptDisclaimer = (layer) => {
  if (window.acceptedDisclaimers === undefined || window.acceptedDisclaimers.indexOf(layer.name) === -1) {
    return false;
  } else {
    return true;
  }
};

getLayerList = (callback) => {
  let allLayers = [];
  const layerList = Object.assign([], this.getActiveLayerGroups());
  layerList.forEach((group) => {
    allLayers.push(this.sortLayers(group.layers));
  });
  callback(allLayers);
}
//HANDLE LIST VIEW ONLY FUNCTIONS
//HANDLE SHARED FUNCTIONS
getActiveLayerGroups = () => {
  switch(this.state.type){
    case "LIST":
      return this.state.layerListGroups;
    case "FOLDER":
      return this.state.layerFolderGroups;
    default:
      return [];
  }
};
setSelectedGroup = (selectedGroup, callback) => {
  this.setState({selectedGroup: selectedGroup }, 
     ()=>{
       this.updateLayerCount();
       this.updateLayerVisibility();
       if (callback !== undefined) callback();
    });
}
setLayerGroups = (updateType,layerGroups, callback) =>{
  switch(updateType){
    case "LIST":
      this.setState({layerListGroups: layerGroups}, ()=>{
        if (callback !== undefined) callback();});
      break;
    case "FOLDER":
      this.setState({layerFolderGroups: layerGroups }, ()=>{
        if (callback !== undefined) callback();});
      break;
    default:
      break;
  }
};
updateLayerVisibility = (type=undefined) => {
  if (type===undefined) type = this.state.type
  const layerFolderGroups = Object.assign([], this.state.layerFolderGroups);
  const selectedGroup = Object.assign({}, this.state.selectedGroup);
  switch(type){
    case "LIST":
      layerFolderGroups.forEach((group) => {
        group.layers.forEach((layer) => {
          layer.layer.setVisible(false);
        });
      });
      selectedGroup.layers.forEach((layer) => {
        if (layer.visible) layer.layer.setVisible(true);
      }); 
      break;
    case "FOLDER":
      selectedGroup.layers.forEach((layer) => {
        layer.layer.setVisible(false);
      }); 
      layerFolderGroups.forEach((group) => {
        group.layers.forEach((layer) => {
          if (layer.visible) layer.layer.setVisible(true);
        });
      });
      break;
    case "CLEAR":
        selectedGroup.layers.forEach((layer) => {
          layer.layer.setVisible(false);
        }); 
        layerFolderGroups.forEach((group) => {
          group.layers.forEach((layer) => {
            if (layer.visible) layer.layer.setVisible(false);
          });
        });
        break;
    default:
      break;
  }
};
updateLayerCount = (numLayers) => {
  switch(this.state.type){
    case "LIST":
      if (numLayers === undefined) numLayers = this.state.selectedGroup.layers.length;
      if (this.state.layerCount !== numLayers) this.setState({ layerCount: numLayers })
      break;
    case "FOLDER":
      let layerCount = 0;
      this.state.layerFolderGroups.map((group) => (layerCount += group.layers.length));
      if (this.state.layerCount !== layerCount) this.setState({ layerCount: layerCount });    
      break;
    default:
      if (this.state.layerCount !== 0) this.setState({ layerCount: 0 });
      break;
  }
};
//#endregion
//#region HANDLE SORTING

  // FIRES AFTER SORTING
  onSortEnd = ({ oldIndex, newIndex, collection }, e) => {
    if (oldIndex === newIndex) {
      return;
    }
    let group = Object.assign({},this.state.selectedGroup);
    group.layers = arrayMove(group.layers, oldIndex, newIndex);
    this.setLayerGroups(this.state.type, this.state.layerListGroups.map((item)=> group.value === item.value? group:item),()=>
    {
      this.setState({ selectedGroup: group},       () => {
        TOCHelpers.updateLayerIndex(group.layers, (result) => {});
      });
    });
  };

  // TRACK CURSOR SO I CAN RETURN IT TO SAME LOCATION AFTER ACTIONS
  onSortMove = (e) => {
  };
getInitialSort = () => {
  if (isMobile) return true;
  else return false;
};
sortLayers = (layers) => {
  // console.log("sort");
  let newLayers = Object.assign([{}], layers);
  if (this.state.sortListAlpha) newLayers.sort(TOCHelpers.sortByAlphaCompare);
  else newLayers.sort(TOCHelpers.sortByIndexCompare);
  TOCHelpers.updateLayerIndex(newLayers, (result) => {});

  // console.log(newLayers);
  return newLayers;
};
//#endregion
//#region HANDLE FOLDER LIST SPECIFIC FUNCTIONS
//HANDLE FOLDER VIEW ONLY FUNCTIONS
// TOGGLE VISIBILITY FOR GROUP
onLayerVisibilityGroup = (group, visible) => {
  this.state.layerFolderGroups.forEach((groupItem) => {
    if (groupItem.value === group.value) {
      let newGroup = Object.assign({}, groupItem);
      let newLayers = Object.assign([], group.layers);
      newLayers.forEach((layer) => {
        layer.layer.setVisible(visible);
        layer.visible = visible;
      });
      newGroup.layers = newLayers;
      this.setLayerGroups("FOLDER",this.state.layerFolderGroups.map((item) => (item.value === group.value ? newGroup : item)));
    }
  });
};
// TOGGLE LEGEND FOR GROUP
onLegendToggleGroup = (group, showLegend) => {
  group.layers.forEach((layer) => {
    layer.showLegend = showLegend;
    this.onLegendToggle(layer, group);
  });
};
// TOGGLE LEGEND
onLegendToggle = (layerInfo, group, callback=undefined) => {
  let showLegend = !layerInfo.showLegend;

  if (layerInfo.legendImage === null) {
    TOCHelpers.getBase64FromImageUrl(layerInfo.styleUrl, (height, imgData) => {
      const rowHeight = showLegend ? (height += 36) : 30;
      let newGroup = Object.assign({}, group);
      let newLayers = Object.assign([], group.layers);
      layerInfo.showLegend = showLegend;
      layerInfo.height = rowHeight;
      layerInfo.legendImage = imgData;
      layerInfo.legendHeight = rowHeight;

      newLayers = newLayers.map((layer2) => (layer2.name === layerInfo.name ? layerInfo : layer2 ));
      newGroup.layers = newLayers;
      this.setLayerGroups(this.state.type, this.getActiveLayerGroups().map((item) => (item.value === newGroup.value ? newGroup : item)), () => {
       if (callback !== undefined) callback();
      });
    });
  } else {
    const rowHeight = showLegend ? layerInfo.legendHeight : 30;
    let newGroup = Object.assign({}, group);
    let newLayers = Object.assign([], group.layers);

    layerInfo.height = rowHeight;
    layerInfo.showLegend = showLegend;

    newLayers = newLayers.map((layer2) => (layer2.name === layerInfo.name ? layerInfo : layer2));
    newGroup.layers = newLayers;
    this.setLayerGroups(this.state.type, this.getActiveLayerGroups().map((item) => (item.value === newGroup.value ? newGroup : item)), () => {

     this.forceUpdate();
    });
  }
};
onLayerChange = (layer, group, callback) => {
  this.setLayerGroups(this.state.type, this.getActiveLayerGroups().map((groupItem) => {
    //if not matched return existing group
    if (groupItem.value !== group.value && groupItem.value !== group) return groupItem;
    //replace matched layer
    groupItem.layers = groupItem.layers.map((layer2) => (layer2.name !== layer.name ? layer2 : layer));
    return groupItem;}) , ()=>{
      if (callback !== undefined) callback();});
  
};

onGroupFolderToggle = (groupName, panelOpen) => {
  this.setState({layerFolderGroups: this.state.layerFolderGroups.map((groupItem) => {
    //if not matched return existing group
    if ( groupItem.value !== groupName) return groupItem;
    groupItem.panelOpen = panelOpen;
    return groupItem;})
  });
  
}
//#endregion
//#region HANDLE ACTIVATE LAYER/GROUP
onActivateLayerGroup = (groupName, callback) => {
  window.emitter.emit("setSidebarVisiblity", "OPEN");
  window.emitter.emit("activateTab", "layers");
  switch (this.state.type){
    case "LIST":
      this.state.layerListGroups.forEach((layerGroup) => {
        if (layerGroup.value === groupName) {
          this.setSelectedGroup(layerGroup,()=> callback());
        }
      });
      break;
    case "FOLDER":
      this.setLayerGroups(this.state.type, this.getActiveLayerGroups().map((groupItem) => {
        //if not matched return existing group
        if (groupItem.value !== groupName) return groupItem;
        groupItem.panelOpen = true;
        return groupItem;}) , ()=>{
          if (callback !== undefined) callback();});
      
      break;
    default:
      callback();
      break;
  }
};
onActivateLayer = (layerItem) => {
  let layerGroups = this.getActiveLayerGroups();

  let currentGroup = layerGroups.filter((item) => item.value === layerItem.layerGroup)[0];
  currentGroup.panelOpen = true;
  currentGroup = currentGroup.layers.map((layer)=>{
    if (layer.name === layerItem.fullName && layer.group === layerItem.layerGroup) {
      layer.layer.setVisible(true);
      layer.visible = true;
      return layer;
    }else{
      return layer;
    }
  });
  this.setLayerGroups(this.state.type, layerGroups.map((item) => (item.value === currentGroup.value ? currentGroup : item)));
};
//#endregion 
//#region HANDLE LAYER OPTIONS MENU CALLBACKS
onLayerOptionsClick = (evt, layerInfo) =>{
  var evtClone = Object.assign({}, evt);
  const menu = (
    <LayerOptionsMenu 
      key={helpers.getUID} 
      evt={evtClone} 
      layerInfo={layerInfo}
      onLayerChange={this.onLayerChange}  
    />
  );
  ReactDOM.render(menu, document.getElementById("portal-root"));
}
//#endregion
//#region HANDLE HEADER CALLBACKS
  onSearchChange = (value) => {
    this.setState({ searchText: value });
  };
  onTypeChange = () => {
    this.setState({ type: this.state.type ==="LIST"?"FOLDER":"LIST"  },()=>{
      helpers.saveToStorage(this.storageKeyTOCType, this.state.type);
      this.updateLayerCount();
      this.updateLayerVisibility();
    });
  };
  onSortSwitchChange = (sortAlpha) => {
    switch (this.state.type){
      case "LIST":
        let currentGroup = Object.assign({},this.state.selectedGroup);
        let newLayers = Object.assign([], currentGroup.layers);
        if (sortAlpha) newLayers.sort(TOCHelpers.sortByAlphaCompare);
        else newLayers.sort(TOCHelpers.sortByIndexCompare);
  
        currentGroup.layers = newLayers;
        let newLayerListGroups = this.state.layerListGroups.map((groupItem) => {
          if (groupItem.value === currentGroup.value){
            return currentGroup;
          }else{
            return groupItem;
          }
        });
        this.setState({layerListGroups: newLayerListGroups, selectedGroup:currentGroup, sortListAlpha: sortAlpha }, ()=>{
          TOCHelpers.updateLayerIndex(currentGroup.layers, (result) => {});
          if (sortAlpha) {
            helpers.showMessage("Sorting", "Layer re-ordering disabled.", helpers.messageColors.yellow);
          }
        });
        
        break;
      case "FOLDER":
        let newLayerGroups = [];
        this.state.layerFolderGroups.forEach((groupItem) => {
          let newGroup = Object.assign({}, groupItem);
          let newLayers = Object.assign([], newGroup.layers);
          if (sortAlpha) newLayers.sort(TOCHelpers.sortByAlphaCompare);
          else newLayers.sort(TOCHelpers.sortByIndexCompare);
    
          newGroup.layers = newLayers;
          newLayerGroups.push(newGroup);
        });
        this.setState( {layerFolderGroups: newLayerGroups,sortFolderAlpha: sortAlpha}, ()=>{this.forceUpdate();});
        break;
      default:
      
        break;
    }
    helpers.addAppStat("TOC Sort", sortAlpha);
  };
  onResetToDefault = () => {

    this.setState({ sortListAlpha: false,sortFolderAlpha: false, searchText: "" }, () => {
      this.refreshTOC(true);
    });
    helpers.addAppStat("TOC Reset", "Button");
  };
  onTurnOffLayers = () => {
    let newLayerGroups = [];
    this.getActiveLayerGroups().forEach((groupItem) => {
      let newGroup = Object.assign({}, groupItem);
      let newLayers = Object.assign([], newGroup.layers);
      newLayers.forEach((layer) => {
        layer.layer.setVisible(false);
        layer.visible = false;
      });
  
      newGroup.layers = newLayers;
      newLayerGroups.push(newGroup);
    });
    this.setLayerGroups(this.state.type, newLayerGroups, ()=>{});
    helpers.addAppStat("TOC Turn off Layers", "off");
  };
  onOpenLegend = () => {
    let params = "";
    let activeGroups = [];
    if (this.state.type === "LIST") {
      activeGroups.push(this.state.selectedGroup);
    }else{
      activeGroups = this.state.layerFolderGroups.filter((group)=> {return group.panelOpen});
    }
    activeGroups.forEach((group) => {
      let name = "";
      if (group.value.indexOf(":") !== -1) {
        name = group.value.split(":")[1];
      } else name = group.value;
      
      if (params === "") {
        params += "?" + name + "=1";
      } else {
        params += "&" + name + "=1";
      }
    });
  
    helpers.showURLWindow("https://opengis.simcoe.ca/legend/" + params, false, "normal", true, true);
  };
  onSaveAllLayers = () => {
    // GATHER INFO TO SAVE
    this.getLayerList((allLayers)=>{
      const currentGroupList = this.getActiveLayerGroups();
      //const layers = {};
      const groups = {};
      for (var key in allLayers) {
        if (!allLayers.hasOwnProperty(key)) continue;
    
        var obj = allLayers[key];
        const savedLayers = {};
        const savedGroup = {};
        let groupName = "";
        let group = "";
        obj.forEach((layer) => {
          group = layer.group;
          groupName = layer.groupName;
          /*
          //TODO: Save full layer if it was manually added, otherwise only save visibility
          TOCHelpers.layerToJson(layer, (returnObj) => {
            savedLayers[layer.name] = returnObj;
          });
          */
          const saveLayer = {
            name: layer.name,
            visible: layer.visible,
            opacity: layer.opacity,
            index: layer.index,
          };
          savedLayers[layer.name] = saveLayer;
        });
        let currentGroup = currentGroupList.filter((item) => item.value === group)[0];

        //layers[group] = savedLayers;
        savedGroup["name"] = groupName;
        savedGroup["value"] = currentGroup.value;
        savedGroup["label"] = currentGroup.label;
        savedGroup["defaultGroup"] = currentGroup.defaultGroup;
        savedGroup["visibleLayers"] = currentGroup.visibleLayers;
        savedGroup["panelOpen"] = currentGroup.panelOpen;
        savedGroup["wmsGroupUrl"] = currentGroup.wmsGroupUrl;
        savedGroup["customRestUrl"] = currentGroup.customRestUrl;
        savedGroup["prefix"] = currentGroup.prefix;
        savedGroup["layers"] = savedLayers;
    
        groups[group] = savedGroup;
      }
      helpers.saveToStorage(this.state.type === "LIST" ? this.storageKey : this.storageKeyFolder, groups);
      helpers.showMessage("Save", "Layer have been saved.");
    });
    
  };
 //#endregion
  render() {
    return (
      <div>
        <TOCHeader 
          key="sc-toc-header"
          id="sc-toc-header"
          layerCount={this.state.layerCount}
          sortAlpha={this.state.type === "FOLDER" ? this.state.sortFolderAlpha : this.state.sortListAlpha}
          searchText={this.state.searchText}
          tocType={this.state.type}
          isLoading={this.state.isLoading}
          onSortChange={this.onSortSwitchChange}          
          onSearchChange={this.onSearchChange}
          onTOCTypeChange={this.onTypeChange}
          onResetToDefault={this.onResetToDefault}
          onTurnOffLayers={this.onTurnOffLayers}
          onOpenLegend={this.onOpenLegend}
          onSaveAllLayers={this.onSaveAllLayers}
        />
        <TOCFolderView 
          key="sc-toc-folder" 
          id="sc-toc-folder" 
          visible={this.state.type === "FOLDER"} 
          layerGroups={this.state.layerFolderGroups} 
          sortAlpha={this.state.sortFolderAlpha}
          searchText={this.state.searchText}
          saveLayerOptions={this.state.saveLayerOptions}
          onGroupFolderToggle={this.onGroupFolderToggle}
          onLayerOptionsClick={this.onLayerOptionsClick}
          onLayerChange={this.onLayerChange}
          onLegendToggle={this.onLegendToggle}
          onLegendToggleGroup={this.onLegendToggleGroup}
          onLayerVisibilityGroup={this.onLayerVisibilityGroup}
        />
        <TOCListView 
          key="sc-toc-list" 
          id="sc-toc-list" 
          visible={this.state.type === "LIST"} 
          layerCount={this.state.layerCount}
          layerGroups={this.state.layerListGroups} 
          selectedGroup={this.state.selectedGroup}
          searchText={this.state.searchText}
          sortAlpha={this.state.sortListAlpha}
          onGroupDropDownChange={this.setSelectedGroup}
          onLegendToggle={this.onLegendToggle}
          onLayerOptionsClick={this.onLayerOptionsClick}
          onLayerChange={this.onLayerChange}
          onSortMove={this.onSortMove}
          onSortEnd={this.onSortEnd}

        />
        <div className="sc-hidden sc-toc-footer-container" />
      </div>
    );
  }
}

export default TOC;

