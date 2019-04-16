import React, { Component } from "react";
import Navigator from "./navigation";

export default class App extends Component {
  state = {
    latitude: '',
    longitude: '',
    switch1Value: false
  };
  date = {
    time: Date.now()
  }
  render() {
    return (
      <Navigator />
    )
  }

}