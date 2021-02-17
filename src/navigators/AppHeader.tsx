/*!
Copyright 2016-2021 Brazil Ltd.
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

import React, {
  memo,
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
  useMemo
} from "react";
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
  Text,
  ThemeContext
} from "react-native-elements";
import FontAwesome5Icon, {
  FontAwesome5IconProps
} from "react-native-vector-icons/FontAwesome5";
import { useNavigation, NavigationState } from "@react-navigation/native";
import { useDispatch, useSelector, shallowEqual } from "react-redux";

import containerStyle from "../styles/container";
import { ServiceActions } from "../modules/service";
import { ProgramActions, ProgramState } from "../modules/program";
import { appName } from "../config/constants";

const AppHeader = memo(({ route }: { route?: NavigationState }) => {
  const layoutCallbackId = useRef<number>();

  const [containerWidth, setContainerWidth] = useState(0);

  const { theme } = useContext(ThemeContext);

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
    <View
      style={[containerStyle.row, { backgroundColor: theme.colors?.controlBg }]}
      onLayout={onLayout}
    >
      {containerWidth > breakpoint ? (
        <WideHeader route={route} />
      ) : (
        <NarrowHeader />
      )}
    </View>
  );
});
export default AppHeader;

const WideHeader = memo(({ route }: { route?: NavigationState }) => {
  const navigation = useNavigation();

  const dispatch = useDispatch();

  const routeName = useMemo(() => {
    return route?.routeNames[route?.index];
  }, [route]);

  const showTable = useCallback(() => {
    navigation.navigate("table");
  }, []);
  const showList = useCallback(() => {
    dispatch(ProgramActions.update("list", { query: "" }));
    navigation.navigate("list");
  }, []);
  const showRanking = useCallback(() => {
    navigation.navigate("ranking");
  }, []);
  const openSetup = useCallback(() => {
    navigation.navigate("setup");
  }, []);
  const openFile = useCallback(() => {
    navigation.navigate("file");
  }, []);
  const reload = useCallback(() => {
    dispatch(ServiceActions.backendInit());
    dispatch(ServiceActions.commentInit());
  }, []);

  return (
    <>
      <View
        style={[
          containerStyle.container,
          containerStyle.row,
          containerStyle.left
        ]}
      >
        {Platform.OS !== "web" && (
          <Image
            containerStyle={[styles.iconContainer]}
            style={[styles.icon]}
            source={require("../../assets/icon_32x32.png")}
          />
        )}
        <HeaderButton
          title="番組表"
          routeName="table"
          icon={{ name: "th" }}
          isActive={routeName === "table"}
          onPress={showTable}
        />
        <HeaderButton
          title="番組一覧"
          routeName="list"
          icon={{ name: "list" }}
          isActive={routeName === "list"}
          onPress={showList}
        />
        <HeaderButton
          title="ランキング"
          routeName="ranking"
          icon={{ name: "list-ol" }}
          isActive={routeName === "ranking"}
          onPress={showRanking}
        />
      </View>
      <View
        style={[
          containerStyle.container,
          containerStyle.row,
          containerStyle.center
        ]}
      >
        <HeaderSearchBar />
      </View>
      <View
        style={[
          containerStyle.container,
          containerStyle.row,
          containerStyle.right
        ]}
      >
        <HeaderButton
          title="ファイル"
          icon={{ name: "folder-open" }}
          onPress={openFile}
        />
        <HeaderButton title="更新" icon={{ name: "sync" }} onPress={reload} />
        <HeaderButton title="設定" icon={{ name: "cog" }} onPress={openSetup} />
      </View>
    </>
  );
});

const NarrowHeader = memo(() => {
  const navigation = useNavigation();

  const dispatch = useDispatch();

  const { theme } = useContext(ThemeContext);

  const openSetup = useCallback(() => {
    navigation.navigate("setup");
  }, []);
  const openFile = useCallback(() => {
    navigation.navigate("file");
  }, []);
  const reload = useCallback(() => {
    dispatch(ServiceActions.backendInit());
    dispatch(ServiceActions.commentInit());
  }, []);

  return (
    <>
      <View
        style={[
          containerStyle.container,
          containerStyle.row,
          containerStyle.left
        ]}
      >
        {Platform.OS !== "web" && (
          <Image
            containerStyle={styles.iconContainer}
            style={styles.icon}
            source={require("../../assets/icon_32x32.png")}
          />
        )}
        <TouchableOpacity style={styles.iconButton} onPress={openFile}>
          <FontAwesome5Icon
            name="folder-open"
            solid
            color={theme.colors?.control}
            size={24}
          />
        </TouchableOpacity>
      </View>
      <View
        style={[
          containerStyle.container,
          containerStyle.row,
          containerStyle.center
        ]}
      >
        <Text h1 style={[{ color: theme.colors?.control }]}>
          {appName}
        </Text>
      </View>
      <View
        style={[
          containerStyle.container,
          containerStyle.row,
          containerStyle.right
        ]}
      >
        <TouchableOpacity style={styles.iconButton} onPress={reload}>
          <FontAwesome5Icon
            name="sync"
            solid
            size={24}
            color={theme.colors?.control}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={openSetup}>
          <FontAwesome5Icon
            name="cog"
            solid
            size={24}
            color={theme.colors?.control}
          />
        </TouchableOpacity>
      </View>
    </>
  );
});

const HeaderButton = memo(
  ({
    routeName,
    icon,
    isActive,
    ...props
  }: ButtonProps & {
    routeName?: string;
    icon?: FontAwesome5IconProps;
    isActive?: boolean;
  }) => {
    const { theme } = useContext(ThemeContext);

    return (
      <Button
        buttonStyle={[
          {
            backgroundColor: isActive
              ? theme.colors?.controlBgActive
              : theme.colors?.controlBg
          },
          styles.button
        ]}
        titleStyle={[
          { color: isActive ? theme.colors?.primary : theme.colors?.control }
        ]}
        icon={
          icon && (
            <FontAwesome5Icon
              key={routeName}
              style={styles.buttonIcon}
              color={[isActive ? theme.colors?.primary : theme.colors?.control]}
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
  const navigation = useNavigation();

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
    navigation.navigate("list");
  }, [query]);
  const onClearQuery = useCallback(() => {
    dispatch(ProgramActions.update("list", { query: "" }));
  }, []);

  return (
    <SearchBar
      inputContainerStyle={[styles.searchInputContainer]}
      round
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
  searchInputContainer: {
    minWidth: 200
  },
  iconButton: {
    alignItems: "center",
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    width: 40
  }
});
