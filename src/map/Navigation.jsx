import React, { Component } from "react";
import "./Navigation.css";
import { fromLonLat } from "ol/proj";
import * as helpers from "../helpers/helpers";
import mainConfig from "../config.json";
const storageMapDefaultsKey = "Map Defaults";
class Navigation extends Component {
  constructor(props) {
    super(props);

    this.state = {
      containerClassName: "nav-container",
      showCurrentLocation:true,
      showZoomExtent:true,
      showIdentifyFeature:true,
      identifyFeature:false
    };

    // LISTEN FOR SIDEPANEL CHANGES
    window.emitter.addListener("sidebarChanged", isSidebarOpen => this.sidebarChanged(isSidebarOpen));

    // LISTEN FOR CONTROL VISIBILITY CHANGES
    window.emitter.addListener("mapControlsChanged", (control, visible) => this.controlStateChange(control,visible));
  }

  componentDidMount(){
    this.setState({showCurrentLocation:window.mapControls.currentLocation, showZoomExtent:window.mapControls.zoomExtent  });

  }
  /*
  // ZOOM IN BUTTON
  zoomIn() {
    window.map.getView().setZoom(window.map.getView().getZoom() + 1);
  }

  // ZOOM OUT BUTTON
  zoomOut() {
    window.map.getView().setZoom(window.map.getView().getZoom() - 1);
  }
  */
  // ZOOM TO FULL EXTENT
  zoomFullExtent() {
    let centerCoords = mainConfig.centerCoords;
    let defaultZoom = mainConfig.defaultZoom;
    const defaultStorage = sessionStorage.getItem(storageMapDefaultsKey);
    if (defaultStorage !== null) {
      const detaults = JSON.parse(defaultStorage);
      if (detaults.zoom !== undefined) defaultZoom = detaults.zoom;
      if (detaults.center !== undefined) centerCoords = detaults.center;
    }
    window.map.getView().animate({ center: centerCoords, zoom: defaultZoom });
  }
  // TOGGLE IDENTIFY
  toggleIdentify() {
    // DISABLE PARCEL CLICK
    window.disableParcelClick = !window.disableParcelClick;
    // DISABLE IDENTIFY CLICK
    window.disableIdentifyClick = !window.disableIdentifyClick;
    // DISABLE POPUPS
    window.isDrawingOrEditing = !window.isDrawingOrEditing;
    if (window.isDrawingOrEditing){
      window.emitter.emit("changeCursor","standard");
    }else{
      window.emitter.emit("changeCursor","identify");
    }
    helpers.addAppStat("Toggle Identify", "Click");
  }
  // ZOOM TO CURRENT LOCATION
  zoomToCurrentLocation() {
    var options = { timeout: 5000 };
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        const coords = fromLonLat([pos.coords.longitude, pos.coords.latitude]);
        helpers.flashPoint(coords);
      },
      err => {
        helpers.showMessage("Location", "Getting your location failed: " + err.message);
      },
      options
    );

    helpers.addAppStat("Current Location", "Click");
  }

  // HANDLE SIDEBAR CHANGES
  sidebarChanged(isSidebarOpen) {
    //  SIDEBAR IN AND OUT
    if (isSidebarOpen) {
      this.setState({ containerClassName: "nav-container nav-container-slideout" });
    } else {
      this.setState({ containerClassName: "nav-container nav-container-slidein" });
    }
  }
  controlStateChange(control, state) {
    switch (control){
      case "fullExtent":
        this.setState({showZoomExtent:state});
        break;
      case "zoomToCurrentLocation":
        this.setState({showCurrentLocation:state});
        break;
      default:
        break;
    }
  }

  render() {
    return (
      <div id={"sc-map-nav-container"} className={this.state.containerClassName}>
        {/*<div className="zoomButton" onClick={this.zoomIn}>
          +
        </div>
        <div className="zoomButton" onClick={this.zoomOut}>
          -
        </div>*/}
        <div className={"fullExtentButton" + (!this.state.showZoomExtent? " sc-hidden":"")} onClick={this.zoomFullExtent} title="Reset Zoom" alt="Reset Zoom">
          <div className="fullExtentContent"></div>
        </div>
        <div className={"zoomToCurrentLocationButton" + (!this.state.showCurrentLocation? " sc-hidden":"")} onClick={this.zoomToCurrentLocation} title="Current Location" alt="Current Location">
          <div className="zoomToCurrentLocationContent"></div>
        </div>
        <div className={"identifyToggleButton" + (!this.state.showIdentifyFeature? " sc-hidden":"") + (!window.isDrawingOrEditing? " toggleOn":"")} onClick={this.toggleIdentify} title="Toggle Identify" alt="Toggle Identify">
          <div className="identifyToggleContent"></div>
        </div>
      </div>
    );
  }
}

export default Navigation;
