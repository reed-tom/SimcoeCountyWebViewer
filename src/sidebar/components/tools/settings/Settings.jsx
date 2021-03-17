import React, { Component } from "react";
import "./Settings.css";
import { ClearLocalStorageButton } from "./SettingsComponents.jsx";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import settingsConfig from "./config.json";

class Settings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      controlRotate:true,
      controlFullScreen:true,
      controlZoomInOut:true,
      controlCurrentLocation:true,
      controlZoomExtent:true,
      controlScale:true,
      controlScaleLine:true,
      controlBasemap:true,
      controlMeasureShortcut:true,
      controlIdentifyToggle:true
    };
    this.storageKey = "Settings";
    this.storageKeyMapControls = "Map Control Settings";
  }

  componentDidMount() {
    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());
    
    if(window.mapControls !== undefined){
    this.setState({controlRotate:window.mapControls.rotate,
      controlFullScreen:window.mapControls.fullScreen,
      controlZoomInOut:window.mapControls.zoomInOut,
      controlCurrentLocation:window.mapControls.currentLocation,
      controlZoomExtent:window.mapControls.zoomExtent,
      controlScale:window.mapControls.scale,
      controlScaleLine:window.mapControls.scaleLine,
      controlBasemap:window.mapControls.basemap,
      controlMeasureShortcut:window.mapControls.measureShortcut,
      controlIdentifyToggle:window.mapControls.identifyToggle});
    }
  }

  onMapLoad(){
    this.setState({controlRotate:window.mapControls.rotate,
      controlFullScreen:window.mapControls.fullScreen,
      controlZoomInOut:window.mapControls.zoomInOut,
      controlCurrentLocation:window.mapControls.currentLocation,
      controlZoomExtent:window.mapControls.zoomExtent,
      controlScale:window.mapControls.scale,
      controlScaleLine:window.mapControls.scaleLine,
      controlBasemap:window.mapControls.basemap,
      controlMeasureShortcut:window.mapControls.measureShortcut,
      controlIdentifyToggle:window.mapControls.identifyToggle});
    
  }

  glowContainers(container) {
    helpers.glowContainer(container);
  }

  componentWillUnmount() {
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());
  }

  onClose() {
    // CALL PARENT WITH CLOSE
    this.props.onClose();
  }

  onRotateControl = () => {
    this.setState({controlRotate:!this.state.controlRotate},() =>{ 
      window.mapControls.rotate = this.state.controlRotate;
      let map = window.map;
      if (this.state.controlRotate){
        helpers.addMapControl(map, "rotate")
      }else{
        helpers.removeMapControl(map, "rotate")
      }
      this.saveControlSettings();
    });
  }

  onFullScreenControl = () => {
    this.setState({controlFullScreen:!this.state.controlFullScreen},() =>{ 
      window.mapControls.fullScreen = this.state.controlFullScreen;
      let map = window.map;
    
      if (this.state.controlFullScreen){
        helpers.addMapControl(map, "fullscreen")
      }else{
        helpers.removeMapControl(map, "fullscreen")
      }
      //EMIT CHANGE NOTICE FOR ADDITIONAL ITEMS
      window.emitter.emit("mapControlsChanged","fullscreen",this.state.controlFullScreen);
      this.saveControlSettings();
    });
  }


  onZoomInOutControl = () => {
    this.setState({controlZoomInOut:!this.state.controlZoomInOut},() =>{ 
      window.mapControls.zoomInOut = this.state.controlZoomInOut;
      let map = window.map;
    
      if (this.state.controlZoomInOut){
        helpers.addMapControl(map, "zoom")
      }else{
        helpers.removeMapControl(map, "zoom")
      }
      this.saveControlSettings();
    });
  }

  onScaleLineControl = () => {
    this.setState({controlScaleLine:!this.state.controlScaleLine},() =>{ 
      window.mapControls.scaleLine = this.state.controlScaleLine;
      let map = window.map;
    
      if (this.state.controlScaleLine){
        helpers.addMapControl(map, "scaleLine")
      }else{
        helpers.removeMapControl(map, "scaleLine")
      }
      this.saveControlSettings();
    });
  }

  onScaleControl = () => {
    this.setState({controlScale:!this.state.controlScale},() =>{ 
      window.mapControls.scale = this.state.controlScale;
      //EMIT CHANGE NOTICE FOR ITEMS IN THE FOOTER PANEL
      window.emitter.emit("mapControlsChanged","scale",this.state.controlScale);
      this.saveControlSettings();
    });
  }

  onCurrentLocationControl = () => {
    this.setState({controlCurrentLocation:!this.state.controlCurrentLocation},() =>{ 
      window.mapControls.currentLocation = this.state.controlCurrentLocation;
      //EMIT CHANGE NOTICE FOR ITEMS IN THE NAVIGATION PANEL
      window.emitter.emit("mapControlsChanged","zoomToCurrentLocation",this.state.controlCurrentLocation);
      this.saveControlSettings();
    });
  }

  onZoomExtentControl = () => {
    this.setState({controlZoomExtent:!this.state.controlZoomExtent},() =>{ 
      window.mapControls.zoomExtent = this.state.controlZoomExtent;
      //EMIT CHANGE NOTICE FOR ITEMS IN THE NAVIGATION PANEL
      window.emitter.emit("mapControlsChanged","fullExtent",this.state.controlZoomExtent);
      this.saveControlSettings();
    });
  }
  onIdentifyToggleControl = () => {
    this.setState({controlIdentifyToggle:!this.state.controlIdentifyToggle},() =>{ 
      window.mapControls.identifyToggle = this.state.controlIdentifyToggle;
      //EMIT CHANGE NOTICE FOR ITEMS IN THE NAVIGATION PANEL
      window.emitter.emit("mapControlsChanged","identifyToggle",this.state.controlIdentifyToggle);
      this.saveControlSettings();
    });
  }
  onMeasureShortcutControl = () => {
    this.setState({controlMeasureShortcut:!this.state.controlMeasureShortcut},() =>{ 
      window.mapControls.measureShortcut = this.state.controlMeasureShortcut;
      //EMIT CHANGE NOTICE FOR ITEMS IN THE NAVIGATION PANEL
      window.emitter.emit("mapControlsChanged","measureShortcut",this.state.controlMeasureShortcut);
      this.saveControlSettings();
    });
  }
  onBasemapControl = () => {
    this.setState({controlBasemap:!this.state.controlBasemap},() =>{ 
      window.mapControls.basemap = this.state.controlBasemap;
      //EMIT CHANGE NOTICE FOR BASEMAP SWITCHER
      window.emitter.emit("mapControlsChanged","basemap",this.state.controlBasemap);
      this.saveControlSettings();
    });
  }
  saveControlSettings = () =>{
    helpers.saveToStorage(this.storageKeyMapControls,window.mapControls)
  }
  
  applyControlSettings = () => {
    let map = window.map;
    if (this.state.controlRotate) {
      helpers.addMapControl(map, "rotate");
    } else {
      helpers.removeMapControl(map, "rotate");
    }
    if (this.state.controlFullScreen) {
      helpers.addMapControl(map, "fullscreen");
    } else {
      helpers.removeMapControl(map, "fullscreen");
    }
    if (this.state.controlZoomInOut) {
      helpers.addMapControl(map, "zoom");
    } else {
      helpers.removeMapControl(map, "zoom");
    }
    if (this.state.controlScaleLine) {
      helpers.addMapControl(map, "scaleLine");
    } else {
      helpers.removeMapControl(map, "scaleLine");
    }

    //EMIT CHANGE NOTICE FOR ITEMS IN THE NAVIGATION PANEL
    window.emitter.emit("mapControlsChanged", "fullExtent", this.state.controlZoomExtent);
    window.emitter.emit("mapControlsChanged", "zoomToCurrentLocation", this.state.controlCurrentLocation);
    //EMIT CHANGE NOTICE FOR ITEMS IN THE FOOTER PANEL
    window.emitter.emit("mapControlsChanged", "scale", this.state.controlScale);
    //EMIT CHANGE NOTICE FOR BASEMAP SWITCHER
    window.emitter.emit("mapControlsChanged", "basemap", this.state.controlBasemap);
    //EMIT CHANGE NOTICE FOR ADDITIONAL ITEMS
    window.emitter.emit("mapControlsChanged", "fullscreen", this.state.controlFullScreen);
    helpers.saveToStorage(this.storageKeyMapControls, window.mapControls);
  };

  clearLocalData = (key) => {
    if (key === "ALL") {
      localStorage.clear();
      helpers.showMessage("Local Data Cleared", "Your local data has been cleared. Page will now reload.");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      localStorage.removeItem(key);
      helpers.showMessage("Local Data Removed", "Your local data has been cleared. You may need to reload your page to see any changes.");
    }
  };

  render() {
    return (
      <PanelComponent onClose={this.props.onClose} name={this.props.name} helpLink={this.props.helpLink} type="tools">
        <div className="sc-settings-container">
          <div className="sc-container">
            <div className="sc-description">Set your personal preferences.</div>
            <div className="sc-settings-divider" />
            <div className={settingsConfig.showControlSettings ? "" : "sc-hidden"}>
              <div className="sc-title sc-settings-title">VISIBLE CONTROLS</div>
              <div className="sc-container">
                <div className="sc-settings-row sc-arrow">
                  <label>Rotate:</label>
                  <span>
                    <input
                        name="controlRotate"
                        type="checkbox"
                        className="sc-settings-checkbox"
                        checked={this.state.controlRotate}
                        onChange={this.onRotateControl} />
                </span>
              </div>
              <div className="sc-settings-row sc-arrow">
                <label>Full Screen:</label>
                <span>
                    <input
                        name="controlFullScreen"
                        type="checkbox"
                        className="sc-settings-checkbox"
                        checked={this.state.controlFullScreen}
                        onChange={this.onFullScreenControl} />
                </span>
              </div>
              <div className="sc-settings-row sc-arrow">
                <label>Zoom In/Out:</label>
                <span>
                    <input
                        name="controlZoomInOut"
                        type="checkbox"
                        className="sc-settings-checkbox"
                        checked={this.state.controlZoomInOut}
                        onChange={this.onZoomInOutControl} />
                </span>
              </div>
              <div className="sc-settings-row sc-arrow">
                <label>Current Location:</label>
                <span>
                    <input
                        name="controlCurrentLocation"
                        type="checkbox"
                        className="sc-settings-checkbox"
                        checked={this.state.controlCurrentLocation}
                        onChange={this.onCurrentLocationControl} />
                </span>
              </div>
              <div className="sc-settings-row sc-arrow">
                <label>Zoom to Extent:</label>
                <span>
                    <input
                        name="controlZoomExtent"
                        type="checkbox"
                        className="sc-settings-checkbox"
                        checked={this.state.controlZoomExtent}
                        onChange={this.onZoomExtentControl} />
                </span>
              </div>
              <div className="sc-settings-row sc-arrow">
                <label>Identify Toggle:</label>
                <span>
                    <input
                        name="controlIdentifyToggle"
                        type="checkbox"
                        className="sc-settings-checkbox"
                        checked={this.state.controlIdentifyToggle}
                        onChange={this.onIdentifyToggleControl} />
                </span>
              </div>
              <div className="sc-settings-row sc-arrow">
                <label>Measure Shortcut:</label>
                <span>
                    <input
                        name="controlMeasureShortcut"
                        type="checkbox"
                        className="sc-settings-checkbox"
                        checked={this.state.controlMeasureShortcut}
                        onChange={this.onMeasureShortcutControl} />
                </span>
              </div>
              <div className="sc-settings-row sc-arrow">
                <label>Scale Text/Changer:</label>
                <span>
                    <input
                        name="controlScale"
                        type="checkbox"
                        className="sc-settings-checkbox"
                        checked={this.state.controlScale}
                        onChange={this.onScaleControl} />
                </span>
              </div>
              <div className="sc-settings-row sc-arrow">
                <label>Scale Line:</label>
                <span>
                    <input
                        name="controlScaleLine"
                        type="checkbox"
                        className="sc-settings-checkbox"
                        checked={this.state.controlScaleLine}
                        onChange={this.onScaleLineControl} />
                </span>
              </div>
              <div className="sc-settings-row sc-arrow">
                <label>Basemap Changer:</label>
                <span>
                    <input
                        name="controlBasemap"
                        type="checkbox"
                        className="sc-settings-checkbox"
                        checked={this.state.controlBasemap}
                        onChange={this.onBasemapControl} />
                </span>
              </div>
          
                <div className="sc-float-right">
                  <button name="applyControlSettings" className="sc-button" onClick={this.applyControlSettings}>
                    Save/Apply
                  </button>
                </div>
              </div>
            </div>

            <div className="sc-settings-divider" />
            <div className="sc-title sc-settings-title">LOCAL STORAGE</div>
            <div className="sc-container">
              <div className="sc-settings-row sc-arrow">
                <button name="clearLocalStorage" title="Clear all cached settings and reload the page." className="sc-button" onClick={() => this.clearLocalData("ALL")}>
                  Clear All Saved Data
                </button>
              </div>
              <div className="sc-settings-divider" />
              {Object.keys(localStorage).map((key) => (
                <ClearLocalStorageButton key={helpers.getUID()} storageKey={key} clearLocalData={this.clearLocalData} />
              ))}
            </div>

            <div className="sc-container sc-settings-floatbottom" />
          </div>
        </div>
      </PanelComponent>
    );
  }
}

export default Settings;
