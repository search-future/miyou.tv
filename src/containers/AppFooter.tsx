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

import React, {
  memo,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo
} from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  Platform
} from "react-native";
import { ButtonGroup, SearchBar } from "react-native-elements";
import {
  NavigationActions,
  NavigationRoute,
  NavigationParams
} from "react-navigation";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { useSelector, useDispatch, shallowEqual } from "react-redux";

import colorStyle, { active, gray, light } from "../styles/color";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import { RootState } from "../modules";
import { ProgramActions, ProgramState } from "../modules/program";
import searchNavRoute from "../utils/searchNavRoute";

const AppFooter = memo(() => {
  const layoutCallbackId = useRef<number>();

  const [containerWidth, setContainerWidth] = useState(0);
  const [searchBarVisible, setSearchBarVisible] = useState(false);

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
  const openSearchBar = useCallback(() => {
    setSearchBarVisible(true);
  }, []);
  const closeSearchBar = useCallback(() => {
    setSearchBarVisible(false);
  }, []);

  return (
    <View style={colorStyle.bgDark} onLayout={onLayout}>
      {containerWidth <= breakpoint && (
        <View style={[containerStyle.row, colorStyle.bgDark]}>
          <FooterButtons />
          <TouchableOpacity style={styles.searchButton} onPress={openSearchBar}>
            <FontAwesome5Icon name="search" solid size={24} color={light} />
          </TouchableOpacity>
          {searchBarVisible && (
            <View
              style={[containerStyle.row, colorStyle.bgDark, styles.searchBox]}
            >
              <FooterSearchBar />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={closeSearchBar}
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
});
export default AppFooter;

const FooterButtons = memo(() => {
  const dispatch = useDispatch();

  const selectedIndex = useSelector<RootState, number>(
    ({ nav }) => searchNavRoute(nav, "MainNavigator")?.index || 0
  );
  const routes = useSelector<RootState, NavigationRoute<NavigationParams>[]>(
    ({ nav }) => {
      const route = searchNavRoute(nav, "MainNavigator");
      const { routes = [] } = route || {};
      return routes;
    },
    shallowEqual
  );

  const buttons = useMemo(
    () => [
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
      },
    ],
    [selectedIndex]
  );

  const navigate = useCallback(
    (index: number) => {
      const { routeName = "" } = routes[index];
      if (routeName === "List") {
        dispatch(ProgramActions.update("list", { query: "" }));
      }
      dispatch(NavigationActions.navigate({ routeName }));
    },
    [routes]
  );

  return (
    <ButtonGroup
      containerStyle={[colorStyle.bgDark, styles.groupContainer]}
      containerBorderRadius={0}
      selectedButtonStyle={colorStyle.bgBlack}
      buttons={buttons}
      selectedIndex={selectedIndex}
      onPress={navigate}
    />
  );
});

const FooterSearchBar = memo(() => {
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
      containerStyle={[colorStyle.bgDark, styles.searchContainer]}
      inputContainerStyle={[colorStyle.bgGrayDark, styles.searchInputContainer]}
      inputStyle={[textStyle.center, colorStyle.light, styles.searchInput]}
      round
      searchIcon={
        <FontAwesome5Icon name="search" solid size={16} color={gray} />
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
    minHeight: Platform.OS === "web" ? 32 : 64,
  },
});
