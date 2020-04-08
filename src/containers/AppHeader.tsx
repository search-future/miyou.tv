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

import React, { memo, useState, useEffect, useCallback, useRef } from "react";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  LayoutChangeEvent
} from "react-native";
import {
  Button,
  ButtonProps,
  Image,
  SearchBar,
  Text
} from "react-native-elements";
import { NavigationActions, StackActions } from "react-navigation";
import FontAwesome5Icon, {
  FontAwesome5IconProps
} from "react-native-vector-icons/FontAwesome5";
import { useDispatch, useSelector, shallowEqual } from "react-redux";

import colorStyle, { active, gray, light } from "../styles/color";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import { RootState } from "../modules";
import { ServiceActions } from "../modules/service";
import { ProgramActions, ProgramState } from "../modules/program";
import searchNavRoute from "../utils/searchNavRoute";
import { appName } from "../config/constants";

const AppHeader = memo(() => {
  const layoutCallbackId = useRef<number>();

  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(
    () => () => {
      clearTimeout(layoutCallbackId.current);
    },
    []
  );

  const onLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    if (layoutCallbackId.current != null) {
      clearTimeout(layoutCallbackId.current);
    }
    const { layout } = nativeEvent;
    const containerWidth = layout.width;
    layoutCallbackId.current = setTimeout(() => {
      setContainerWidth(containerWidth);
    }, 200);
  }, []);
  return (
    <View style={colorStyle.bgDark} onLayout={onLayout}>
      {containerWidth > breakpoint ? <WideHeader /> : <NarrowHeader />}
    </View>
  );
});
export default AppHeader;

const WideHeader = memo(() => {
  const dispatch = useDispatch();
  const routeName = useSelector<RootState, string | undefined>(
    ({ nav }) => searchNavRoute(nav)?.routeName
  );

  const showTable = useCallback(() => {
    dispatch(NavigationActions.navigate({ routeName: "Table" }));
  }, []);
  const showList = useCallback(() => {
    dispatch(ProgramActions.update("list", { query: "" }));
    dispatch(NavigationActions.navigate({ routeName: "List" }));
  }, []);
  const showRanking = useCallback(() => {
    dispatch(NavigationActions.navigate({ routeName: "Ranking" }));
  }, []);
  const openSetup = useCallback(() => {
    if (routeName !== "Setup") {
      dispatch(StackActions.push({ routeName: "Setup" }));
    }
  }, [routeName]);
  const openFile = useCallback(() => {
    if (routeName !== "File") {
      dispatch(StackActions.push({ routeName: "File" }));
    }
  }, [routeName]);
  const reload = useCallback(() => {
    dispatch(ServiceActions.backendInit());
    dispatch(ServiceActions.commentInit());
  }, []);

  return (
    <View style={containerStyle.row}>
      <View style={[containerStyle.row, containerStyle.left, styles.left]}>
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
          routeName="Table"
          icon={{ name: "th" }}
          onPress={showTable}
        />
        <HeaderButton
          title="番組一覧"
          routeName="List"
          icon={{ name: "list" }}
          onPress={showList}
        />
        <HeaderButton
          title="ランキング"
          routeName="Ranking"
          icon={{ name: "list-ol" }}
          onPress={showRanking}
        />
      </View>
      <View style={[containerStyle.row, containerStyle.center, styles.center]}>
        <HeaderSearchBar />
      </View>
      <View style={[containerStyle.row, containerStyle.right, styles.right]}>
        <HeaderButton
          title="ファイル"
          icon={{ name: "folder-open" }}
          onPress={openFile}
        />
        <HeaderButton title="更新" icon={{ name: "sync" }} onPress={reload} />
        <HeaderButton title="設定" icon={{ name: "cog" }} onPress={openSetup} />
      </View>
    </View>
  );
});

const NarrowHeader = memo(() => {
  const dispatch = useDispatch();
  const routeName = useSelector<RootState, string>(({ nav }) => {
    const route = searchNavRoute(nav);
    if (route) {
      return route.routeName || "";
    }
    return "";
  });

  const openSetup = useCallback(() => {
    if (routeName !== "Setup") {
      dispatch(StackActions.push({ routeName: "Setup" }));
    }
  }, [routeName]);
  const openFile = useCallback(() => {
    if (routeName !== "File") {
      dispatch(StackActions.push({ routeName: "File" }));
    }
  }, [routeName]);
  const reload = useCallback(() => {
    dispatch(ServiceActions.backendInit());
    dispatch(ServiceActions.commentInit());
  }, []);

  return (
    <View style={containerStyle.row}>
      <View style={[containerStyle.row, containerStyle.left, styles.left]}>
        {Platform.OS !== "web" && (
          <Image
            containerStyle={styles.iconContainer}
            placeholderStyle={colorStyle.bgTransparent}
            style={styles.icon}
            source={require("../../assets/icon_32x32.png")}
          />
        )}
        <TouchableOpacity style={styles.iconButton} onPress={openFile}>
          <FontAwesome5Icon name="folder-open" solid color={light} size={24} />
        </TouchableOpacity>
      </View>
      <View style={[containerStyle.row, containerStyle.center, styles.center]}>
        <Text h4 style={colorStyle.light}>
          {appName}
        </Text>
      </View>
      <View style={[containerStyle.row, containerStyle.right, styles.right]}>
        <TouchableOpacity style={styles.iconButton} onPress={reload}>
          <FontAwesome5Icon name="sync" solid size={24} color={light} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={openSetup}>
          <FontAwesome5Icon name="cog" solid size={24} color={light} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const HeaderButton = memo(
  ({
    routeName,
    icon,
    ...props
  }: ButtonProps & {
    routeName?: string;
    icon?: FontAwesome5IconProps;
  }) => {
    const isActive = useSelector<RootState, boolean>(
      ({ nav }) => !!(nav && routeName && searchNavRoute(nav, routeName))
    );

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
  },
  ({ icon: prevIcon, ...prevProps }, { icon: nextIcon, ...nextProps }) =>
    shallowEqual(prevProps, nextProps) && shallowEqual(prevIcon, nextIcon)
);

const HeaderSearchBar = memo(() => {
  const dispatch = useDispatch();
  const listQuery = useSelector<{ program: ProgramState }, string>(
    ({ program }) => program?.list?.query || ""
  );

  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery(listQuery);
  }, [listQuery]);

  const onChangeQuery = useCallback((query: string) => {
    setQuery(query);
  }, []);
  const onSubmitQuery = useCallback(() => {
    dispatch(ProgramActions.update("list", { query }));
    dispatch(NavigationActions.navigate({ routeName: "List" }));
  }, [query]);
  const onClearQuery = useCallback(() => {
    dispatch(ProgramActions.update("list", { query: "" }));
  }, []);

  return (
    <SearchBar
      containerStyle={[colorStyle.bgTransparent, styles.searchContainer]}
      inputContainerStyle={[colorStyle.bgGrayDark, styles.searchInputContainer]}
      inputStyle={[textStyle.center, colorStyle.light, styles.searchInput]}
      round
      searchIcon={
        <FontAwesome5Icon name="search" solid color={gray} size={16} />
      }
      placeholder="Search"
      value={query}
      onChangeText={onChangeQuery}
      onSubmitEditing={onSubmitQuery}
      onClear={onClearQuery}
    />
  );
});

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
    minHeight: Platform.OS === "web" ? 32 : 64,
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
