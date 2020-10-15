import React, { Component } from "react";
import "./FeatureReportPopup.css";
import * as helpers from "../../../helpers/helpers";
import mainConfig from "../../../config.json";
import LoadingScreen from "../../../helpers/LoadingScreen.jsx";
import * as drawingHelpers from "../../../helpers/drawingHelpers";
import InfoRow from "../../../helpers/InfoRow.jsx";
import Select from "react-select";


class FeatureReportPopup extends Component {
  state = {
    reportOption:undefined,
    reportOptions:undefined,
    buffer: 0,
    reports: undefined,
    isLoading:false
  };

  componentDidMount() {
    this.props.onRef(this);
    this.loadReportOptions();
  }
  componentWillUnmount() {
    this.props.onRef(undefined);
  }

  loadReportOptions(callback=undefined) {
    this.setState({isLoading:true});
    helpers.getJSON(mainConfig.reportsUrl,(results)=>{
      let reportOptions = [];
      reportOptions = results.map((item)=> {return {label:item.title, value:item.title}});
      this.setState({reports:results,reportOptions:reportOptions,reportOption:reportOptions[0], isLoading:false});
    });
 
  }
  getSelectedReport = (reportTitle) => {
    return this.state.reports.filter(item => {return item.title === reportTitle})[0];
  }
  onPreviewReport(report, buffer){
    let selectedReport = this.getSelectedReport(report);
    helpers.previewReport(drawingHelpers.getFeatureById(this.props.item.id), selectedReport.preview, buffer, (summaryData) =>{
      if (summaryData === undefined || summaryData.length === 0) {
        helpers.showMessage("Not Found", "There were no results for the current selection");
      }else{
        window.emitter.emit("loadReport", <SummaryReport summary={summaryData} />);
      }
      this.setState({isLoading:false});
    });
 
  } 
  onGenerateReport(report, buffer) {
    let selectedReport = this.getSelectedReport(report);
   
    helpers.generateReport(drawingHelpers.getFeatureById(this.props.item.id), selectedReport.report, buffer, ()=>{
      this.setState({isLoading:false});
    });
  
  }
  componentWillReceiveProps(nextProps) {
    // this.popupLabelRef.forceUpdate();
  }

  render() {
    return (
      <div className="sc-mymaps-popup-container">
        <LoadingScreen key={helpers.getUID()} visible={this.state.isLoading} spinnerSize={60} /> 
        Report:
        <Select name="availableReports"  options={this.state.reportOptions} value={this.state.reportOption} onChange={(evt) => {this.setState({report:evt.target.value});} } />
         <br />
        Buffer:
        <select name="featureBuffer" value={this.state.buffer} onChange={(evt) => {this.setState({buffer:evt.target.value});} }>
          <option value="0">None</option>
          <option value="50">50 Meters</option>
          <option value="100">100 Meters</option>
        </select>
        <FooterButtons
          onPreviewReport={() => {
                                  this.setState({isLoading:true});
                                  this.onPreviewReport(this.state.reportOption.value, this.state.buffer);
                                }}
          onGenerateReport={() => {
                                this.setState({isLoading:true});
                                this.onGenerateReport(this.state.reportOption.value, this.state.buffer);
                              }}
        />
      </div>
    );
  }
}

export default FeatureReportPopup;

function SummaryReport(props){
  return (
    <div>
        {props.summary.map(item => (
          <InfoRow key={helpers.getUID()} label={item.section} value={item.record_count}></InfoRow>
        ))}
    </div>
  );
}
function FooterButtons(props) {
  return (
    <div className="sc-mymaps-footer-buttons-container">
      <button className="sc-button sc-mymaps-popup-footer-button" key={helpers.getUID()} id={helpers.getUID()} onClick={props.onPreviewReport}>
        Preview Report
      </button>
      <button className="sc-button sc-mymaps-popup-footer-button" key={helpers.getUID()} id={helpers.getUID()} onClick={props.onGenerateReport}>
        Generate Excel Report
      </button>
      <button
        className="sc-button sc-mymaps-popup-footer-button"
        key={helpers.getUID()}
        id={helpers.getUID()}
        onClick={() => {
          window.popup.hide();
        }}
      >
        <img src={images["closeX.gif"]} className={"sc-mymaps-footer-buttons-img"} alt="Close" />
        Close
      </button>
    </div>
  );
}

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
