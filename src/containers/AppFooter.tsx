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
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { ButtonGroup, SearchBar } from "react-native-elements";
import { NavigationActions, NavigationState } from "react-navigation";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import colorStyle, { active, gray, light } from "../styles/color";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import {
  ProgramActions,
  ProgramState,
  ProgramListData
} from "../modules/program";
import searchNavRoute from "../utils/searchNavRoute";

type Props = {
  dispatch: Dispatch;
  nav: NavigationState;
  list: ProgramListData;
};
type State = {
  containerWidth: number;
  searchBarVisible: boolean;
  query: string;
};
class AppFooter extends Component<Props, State> {
  state = {
    containerWidth: 0,
    searchBarVisible: false,
    query: ""
  };
  layoutCallbackId?: number;

  render() {
    const { nav } = this.props;
    const { containerWidth, searchBarVisible, query } = this.state;
    const route = searchNavRoute(nav, "MainNavigator");
    const { index: selectedIndex = 0 } = route || {};

    return (
      <View
        style={colorStyle.bgDark}
        onLayout={({ nativeEvent }) => {
          if (this.layoutCallbackId != null) {
            clearTimeout(this.layoutCallbackId);
          }
          const { layout } = nativeEvent;
          const containerWidth = layout.width;
          this.layoutCallbackId = setTimeout(() => {
            this.setState({ containerWidth });
          }, 200);
        }}
      >
        {containerWidth <= breakpoint && (
          <View style={[containerStyle.row, colorStyle.bgDark]}>
            <ButtonGroup
              containerStyle={[colorStyle.bgDark, styles.groupContainer]}
              containerBorderRadius={0}
              selectedButtonStyle={colorStyle.bgBlack}
              buttons={[
                {
                  element: () => (
                    <FontAwesome5Icon
                      name="th"
                      solid
                      size={24}
                      color={selectedIndex === 0 ? active : light}
                    />
                  )
                },
                {
                  element: () => (
                    <FontAwesome5Icon
                      name="list"
                      solid
                      size={24}
                      color={selectedIndex === 1 ? active : light}
                    />
                  )
                },
                {
                  element: () => (
                    <FontAwesome5Icon
                      name="list-ol"
                      solid
                      size={24}
                      color={selectedIndex === 2 ? active : light}
                    />
                  )
                }
              ]}
              selectedIndex={selectedIndex}
              onPress={index => {
                const { dispatch, nav } = this.props;
                const route = searchNavRoute(nav, "MainNavigator");
                const { routes = [] } = route || {};
                const { routeName = "" } = routes[index];
                if (routeName === "List") {
                  dispatch(ProgramActions.update("list", { query: "" }));
                }
                dispatch(NavigationActions.navigate({ routeName }));
              }}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => {
                this.setState({ searchBarVisible: true });
              }}
            >
              <FontAwesome5Icon name="search" solid size={24} color={light} />
            </TouchableOpacity>
            {searchBarVisible && (
              <View
                style={[
                  containerStyle.row,
                  colorStyle.bgDark,
                  styles.searchBox
                ]}
              >
                <SearchBar
                  containerStyle={[colorStyle.bgDark, styles.searchContainer]}
                  inputContainerStyle={[
                    colorStyle.bgGrayDark,
                    styles.searchInputContainer
                  ]}
                  inputStyle={[
                    textStyle.center,
                    colorStyle.light,
                    styles.searchInput
                  ]}
                  round
                  searchIcon={
                    <FontAwesome5Icon
                      name="search"
                      solid
                      size={16}
                      color={gray}
                    />
                  }
                  placeholder="Search"
                  value={query}
                  onChangeText={query => {
                    this.setState({ query });
                  }}
                  onSubmitEditing={() => {
                    const { dispatch } = this.props;
                    const { query } = this.state;
                    dispatch(ProgramActions.update("list", { query }));
                    dispatch(NavigationActions.navigate({ routeName: "List" }));
                  }}
                  onClear={() => {
                    const { dispatch } = this.props;
                    dispatch(ProgramActions.update("list", { query: "" }));
                  }}
                />
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={() => {
                    this.setState({ searchBarVisible: false });
                  }}
                >
                  <FontAwesome5Icon
                    name="caret-down"
                    solid
                    size={24}
                    color={light}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  componentDidUpdate(prevProps: Props) {
    const { list } = this.props;
    const { query = "" } = list;
    const { query: prevQuery = "" } = prevProps.list;
    if (query !== prevQuery) {
      this.setState({ query });
    }
  }

  componentWillUnmount() {
    clearTimeout(this.layoutCallbackId);
  }
}

export default connect(
  ({
    nav,
    program: { list = {} }
  }: {
    nav: NavigationState;
    program: ProgramState;
  }) => ({
    nav,
    list
  })
)(AppFooter);

const breakpoint = 768;

const styles = StyleSheet.create({
  groupContainer: {
    borderRadius: 0,
    borderWidth: 0,
    borderRightWidth: 1,
    flex: 1,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0
  },
  menuContainer: {
    width: "100%"
  },
  searchButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  searchBox: {
    bottom: 0,
    height: "100%",
    left: 0,
    position: "absolute",
    right: 0
  },
  searchContainer: {
    borderBottomWidth: 0,
    borderTopWidth: 0,
    flex: 1,
    padding: 0
  },
  searchInputContainer: {
    height: 32,
    overflow: "hidden"
  },
  searchInput: {
    fontSize: 16,
    minHeight: 30
  }
});
