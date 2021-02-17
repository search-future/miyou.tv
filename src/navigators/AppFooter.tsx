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
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent
} from "react-native";
import { ButtonGroup, SearchBar, ThemeContext } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { useNavigation, NavigationState } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";

import containerStyle from "../styles/container";
import { ProgramActions, ProgramState } from "../modules/program";

const AppFooter = memo(({ route }: { route?: NavigationState }) => {
  const layoutCallbackId = useRef<number>();

  const [containerWidth, setContainerWidth] = useState(0);
  const [searchBarVisible, setSearchBarVisible] = useState(false);

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
  const openSearchBar = useCallback(() => {
    setSearchBarVisible(true);
  }, []);
  const closeSearchBar = useCallback(() => {
    setSearchBarVisible(false);
  }, []);

  return (
    <View
      style={[containerStyle.row, { backgroundColor: theme.colors?.controlBg }]}
      onLayout={onLayout}
    >
      {containerWidth <= breakpoint && (
        <>
          <FooterButtons route={route} />
          <TouchableOpacity style={styles.searchButton} onPress={openSearchBar}>
            <FontAwesome5Icon
              name="search"
              solid
              size={24}
              color={theme.colors?.control}
            />
          </TouchableOpacity>
          {searchBarVisible && (
            <View
              style={[
                containerStyle.row,
                styles.searchBox,
                { backgroundColor: theme.colors?.controlBg }
              ]}
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
                  color={theme.colors?.control}
                />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
});
export default AppFooter;

const FooterButtons = memo(({ route }: { route?: NavigationState }) => {
  const navigation = useNavigation();

  const { theme } = useContext(ThemeContext);

  const selectedIndex = useMemo(() => route?.index, [route]);
  const buttons = useMemo(
    () => [
      {
        element: () => (
          <FontAwesome5Icon
            name="th"
            solid
            size={24}
            color={
              selectedIndex === 0
                ? theme.colors?.primary
                : theme.colors?.control
            }
          />
        )
      },
      {
        element: () => (
          <FontAwesome5Icon
            name="list"
            solid
            size={24}
            color={
              selectedIndex === 1
                ? theme.colors?.primary
                : theme.colors?.control
            }
          />
        )
      },
      {
        element: () => (
          <FontAwesome5Icon
            name="list-ol"
            solid
            size={24}
            color={
              selectedIndex === 2
                ? theme.colors?.primary
                : theme.colors?.control
            }
          />
        )
      }
    ],
    [selectedIndex, theme.colors?.primary, theme.colors?.control]
  );

  const navigate = useCallback(
    (index: number) => {
      const name = route?.routeNames[index];
      if (name) {
        navigation.navigate(name);
      }
    },
    [route]
  );

  return (
    <ButtonGroup
      containerStyle={[
        styles.groupContainer,
        {
          backgroundColor: theme.colors?.controlBg,
          borderColor: theme.colors?.controlBorder
        }
      ]}
      innerBorderStyle={{ color: theme.colors?.controlBorder }}
      selectedButtonStyle={[{ backgroundColor: theme.colors?.controlBgActive }]}
      containerBorderRadius={0}
      buttons={buttons}
      selectedIndex={selectedIndex}
      onPress={navigate}
    />
  );
});

const FooterSearchBar = memo(() => {
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
      containerStyle={[containerStyle.container]}
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
  }
});
