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
import { TouchableOpacity, View, StyleSheet, Platform } from "react-native";
import {
  Button,
  ButtonProps,
  Image,
  SearchBar,
  Text
} from "react-native-elements";
import {
  NavigationActions,
  NavigationState,
  StackActions
} from "react-navigation";
import FontAwesome5Icon, {
  FontAwesome5IconProps
} from "react-native-vector-icons/FontAwesome5";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import colorStyle, { active, gray, light } from "../styles/color";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import { ServiceActions } from "../modules/service";
import searchNavRoute from "../utils/searchNavRoute";
import { appName } from "../config/constants";

type Props = {
  dispatch: Dispatch;
  nav: NavigationState;
};
type State = {
  containerWidth: number;
  query: string;
};
class AppHeader extends Component<Props, State> {
  state = {
    containerWidth: 0,
    query: ""
  };
  layoutCallbackId?: number;

  render() {
    const { nav } = this.props;
    const { containerWidth, query } = this.state;
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
        {containerWidth > breakpoint ? (
          <View style={containerStyle.row}>
            <View
              style={[containerStyle.row, containerStyle.left, styles.left]}
            >
              {Platform.OS !== "web" && (
                <Image
                  containerStyle={styles.iconContainer}
                  placeholderStyle={colorStyle.bgTransparent}
                  style={styles.icon}
                  source={require("../../assets/icon_32x32.png")}
                />
              )}
              <HeaderButton
                title="番組表"
                nav={nav}
                routeName="Table"
                icon={{ name: "th" }}
                onPress={() => {
                  this.navigate("Table");
                }}
              />
              <HeaderButton
                title="番組一覧"
                nav={nav}
                routeName="List"
                icon={{ name: "list" }}
                onPress={() => {
                  this.navigate("List");
                }}
              />
              <HeaderButton
                title="ランキング"
                nav={nav}
                routeName="Ranking"
                icon={{ name: "list-ol" }}
                onPress={() => {
                  this.navigate("Ranking");
                }}
              />
            </View>
            <View
              style={[containerStyle.row, containerStyle.center, styles.center]}
            >
              <SearchBar
                containerStyle={[
                  colorStyle.bgTransparent,
                  styles.searchContainer
                ]}
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
                    color={gray}
                    size={16}
                  />
                }
                placeholder="Search"
                value={query}
                onChangeText={query => {
                  this.setState({ query });
                }}
              />
            </View>
            <View
              style={[containerStyle.row, containerStyle.right, styles.right]}
            >
              <HeaderButton
                title="更新"
                icon={{ name: "sync" }}
                onPress={() => {
                  this.reload();
                }}
              />
              <HeaderButton
                title="設定"
                icon={{ name: "cog" }}
                onPress={() => {
                  this.setup();
                }}
              />
            </View>
          </View>
        ) : (
          <View style={containerStyle.row}>
            <View
              style={[containerStyle.row, containerStyle.left, styles.left]}
            >
              {Platform.OS !== "web" && (
                <Image
                  containerStyle={styles.iconContainer}
                  placeholderStyle={colorStyle.bgTransparent}
                  style={styles.icon}
                  source={require("../../assets/icon_32x32.png")}
                />
              )}
            </View>
            <View
              style={[containerStyle.row, containerStyle.center, styles.center]}
            >
              <Text h4 style={colorStyle.light}>
                {appName}
              </Text>
            </View>
            <View
              style={[containerStyle.row, containerStyle.right, styles.right]}
            >
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  this.reload();
                }}
              >
                <FontAwesome5Icon name="sync" solid size={24} color={light} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  this.setup();
                }}
              >
                <FontAwesome5Icon name="cog" solid size={24} color={light} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  componentWillUnmount() {
    clearTimeout(this.layoutCallbackId);
  }

  navigate(routeName: string) {
    const { dispatch } = this.props;
    dispatch(NavigationActions.navigate({ routeName }));
  }

  setup() {
    const { dispatch } = this.props;
    dispatch(StackActions.push({ routeName: "Setup" }));
  }

  reload() {
    const { dispatch } = this.props;
    dispatch(ServiceActions.backendInit());
    dispatch(ServiceActions.commentInit());
  }
}

export default connect(({ nav }: { nav: NavigationState }) => ({ nav }))(
  AppHeader
);

class HeaderButton extends Component<
  ButtonProps & {
    nav?: NavigationState;
    routeName?: string;
    icon?: FontAwesome5IconProps;
  }
> {
  render() {
    const { nav, routeName, icon, ...props } = this.props;
    const isActive = nav && routeName && searchNavRoute(nav, routeName);
    return (
      <Button
        buttonStyle={[
          isActive ? colorStyle.bgBlack : colorStyle.bgDark,
          styles.button
        ]}
        titleStyle={[
          isActive ? colorStyle.active : colorStyle.light,
          styles.buttonTitle
        ]}
        icon={
          icon && (
            <FontAwesome5Icon
              key={routeName}
              style={styles.buttonIcon}
              color={isActive ? active : light}
              size={16}
              {...icon}
            />
          )
        }
        {...props}
      />
    );
  }
}

const breakpoint = 768;

const styles = StyleSheet.create({
  left: {
    flex: 1
  },
  center: {
    flex: 1
  },
  right: {
    flex: 1
  },
  iconContainer: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  icon: {
    height: 40,
    width: 40
  },
  button: {
    margin: 0,
    borderRadius: 0,
    borderWidth: 0,
    height: 40
  },
  buttonIcon: {
    paddingRight: 4,
    paddingTop: 2
  },
  buttonTitle: {
    fontSize: 16
  },
  searchContainer: {
    borderBottomWidth: 0,
    borderTopWidth: 0,
    padding: 0
  },
  searchInputContainer: {
    height: 32,
    minWidth: 200,
    overflow: "hidden"
  },
  searchInput: {
    fontSize: 16,
    minHeight: 30,
    padding: 0
  },
  iconButton: {
    alignItems: "center",
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    width: 40
  }
});
