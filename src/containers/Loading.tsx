/*!
Copyright 2016-2019 Brazil Ltd.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React, { Component } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import { active } from "../styles/color";
import { LoadingState } from "../modules/loading";

type Props = {
  dispatch: Dispatch;
  loading: LoadingState;
};
class Loading extends Component<Props> {
  render() {
    const { loading } = this.props;
    const { blocking, enabled } = loading;
    return (
      <ActivityIndicator
        style={[styles.container, enabled && blocking && styles.blocker]}
        color={active}
        animating={enabled}
      />
    );
  }
}

export default connect(({ loading }: { loading: LoadingState }) => ({
  loading
}))(Loading);

const styles = StyleSheet.create({
  container: {
    bottom: "50%",
    left: "50%",
    position: "absolute",
    right: "50%",
    top: "50%"
  },
  blocker: {
    backgroundColor: "#ffffff80",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0
  }
});
