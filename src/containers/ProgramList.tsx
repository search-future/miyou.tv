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
import {
  FlatList,
  Picker,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
  PanResponderInstance
} from "react-native";
import { Badge, ListItem, Text } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import Balloon from "../components/Balloon";
import IconSelector from "../components/IconSelector";
import colorStyle, { active, black, light } from "../styles/color";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import programStyle from "../styles/program";
import {
  ProgramActions,
  ProgramState,
  ProgramListData,
  ProgramListProgram
} from "../modules/program";
import { ServiceState } from "../modules/service";
import { SettingActions, SettingState } from "../modules/setting";
import { ViewerActions, ViewerState } from "../modules/viewer";
import DateFormatter from "../utils/DateFormatter";

type Props = {
  dispatch: Dispatch;
  data: ProgramListData;
  service: ServiceState;
  setting: SettingState & {
    listOptions?: {
      view?: string;
      reverse?: boolean;
    };
    useArchive?: boolean;
    view?: {
      countMode?: string;
      hourFirst?: string;
      hourFormat?: string;
    };
  };
  viewer: ViewerState;
};
type State = {
  containerWidth: number;
  headerHeight: Animated.AnimatedValue;
  viewX: Animated.AnimatedValue;
};
class ProgramList extends Component<Props, State> {
  list: FlatList<ProgramListProgram> | null = null;
  panResponder: PanResponderInstance;
  state = {
    containerWidth: 0,
    headerHeight: new Animated.Value(256),
    viewX: new Animated.Value(0)
  };
  bindKeys: (string | string[])[] = [];
  layoutCallbackId?: number;
  scrollPos = 0;
  headerHeight = 256;

  constructor(props: Props) {
    super(props);
    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: ({}, { dx }) => Math.abs(dx) > 10,
      onPanResponderMove: Animated.event([null, { dx: this.state.viewX }]),
      onPanResponderEnd: ({}, { dx }) => {
        const { containerWidth, viewX } = this.state;
        if (Math.abs(dx) > 64) {
          const page = this.getPage() - Math.sign(dx);
          if (page < 1) {
            viewX.setValue(0);
          } else {
            const { data, setting } = this.props;
            const { hits = 0 } = data;
            const { listOptions = {} } = setting;
            const { view = "25" } = listOptions;
            const max = Math.ceil(hits / parseInt(view, 10));
            if (page > max) {
              viewX.setValue(0);
            } else {
              Animated.timing(viewX, {
                toValue: dx > 0 ? containerWidth : -containerWidth
              }).start(() => {
                const { viewX } = this.state;
                viewX.setValue(0);
              });
            }
          }
          this.setPage(page);
        } else {
          viewX.setValue(0);
        }
      }
    });
  }

  render() {
    const { data, service, setting, viewer } = this.props;
    const { hits = 0, page = 1, programs = [], query = "" } = data;
    const { archiveActive } = service;
    const {
      listOptions = {},
      useArchive = true,
      view: viewSetting = {}
    } = setting;
    const { hourFirst = "4", hourFormat = "" } = viewSetting;
    const { view = "25", reverse = true } = listOptions;
    const { programs: viewerPrograms, index: viewerIndex } = viewer;
    const viewerProgram = viewerPrograms[viewerIndex] || {};
    const { containerWidth, headerHeight, viewX } = this.state;

    const dateFormatter = new DateFormatter(
      parseInt(hourFirst, 10),
      hourFormat
    );

    const viewNum = parseInt(view, 10);
    const startIndex = (page - 1) * viewNum + 1;
    let endIndex = page * viewNum;
    if (endIndex > hits) {
      endIndex = hits;
    }
    const pages = [];
    const max = Math.ceil(hits / viewNum);
    for (let i = 0; i < max; i++) {
      pages.push(i + 1);
    }

    return (
      <View
        style={[colorStyle.bgLight, styles.container]}
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
        {containerWidth > 0 && (
          <Animated.View
            style={[
              containerWidth > breakpoint
                ? containerStyle.row
                : containerStyle.column,
              colorStyle.bgBlack,
              styles.header,
              {
                maxHeight: headerHeight
              }
            ]}
          >
            <View
              style={
                containerWidth > breakpoint
                  ? [
                      containerStyle.row,
                      containerStyle.wrap,
                      containerStyle.left,
                      programStyle.headerColumn
                    ]
                  : programStyle.headerRow
              }
            >
              {archiveActive && (
                <IconSelector
                  containerStyle={[
                    colorStyle.bgDark,
                    colorStyle.borderGrayDark,
                    programStyle.headerControl
                  ]}
                  style={colorStyle.bgDark}
                  color={light}
                  icon={
                    <FontAwesome5Icon name="database" solid color={light} />
                  }
                  selectedValue={useArchive ? 1 : 0}
                  onValueChange={value => {
                    const { dispatch } = this.props;
                    dispatch(SettingActions.update("useArchive", value > 0));
                    this.load();
                  }}
                  items={[
                    { label: "番組表", value: 1 },
                    { label: "録画情報", value: 0 }
                  ]}
                />
              )}
              <IconSelector
                containerStyle={[
                  colorStyle.bgDark,
                  colorStyle.borderGrayDark,
                  programStyle.headerControl,
                  styles.sortPicker
                ]}
                style={colorStyle.bgDark}
                color={light}
                icon={<FontAwesome5Icon name="sort" solid color={light} />}
                selectedValue={reverse ? 1 : 0}
                onValueChange={value => {
                  this.save({ reverse: value > 0 });
                  this.load();
                }}
                items={[
                  { label: "放送日時(新しい順)", value: 1 },
                  { label: "放送日時(古い順)", value: 0 }
                ]}
              />
            </View>
            <View
              style={
                containerWidth > breakpoint
                  ? [
                      containerStyle.row,
                      containerStyle.wrap,
                      containerStyle.right,
                      programStyle.headerColumn,
                      programStyle.headerColumnReverse
                    ]
                  : [programStyle.headerRow, programStyle.headerRowRevese]
              }
            >
              <View
                style={[
                  containerStyle.row,
                  containerStyle.right,
                  programStyle.headerContent
                ]}
              >
                {hits > 0 && (
                  <Text style={[textStyle.right, colorStyle.light]}>
                    {startIndex}-{endIndex}/{hits}
                  </Text>
                )}
              </View>
              <IconSelector
                containerStyle={[
                  colorStyle.bgDark,
                  colorStyle.borderGrayDark,
                  programStyle.headerControl
                ]}
                style={colorStyle.bgDark}
                color={light}
                icon={
                  <FontAwesome5Icon name="arrows-alt-v" solid color={light} />
                }
                selectedValue={view}
                onValueChange={view => {
                  this.save({ view });
                  this.load();
                }}
                items={[
                  { label: "10件表示", value: "10" },
                  { label: "25件表示", value: "25" },
                  { label: "50件表示", value: "50" },
                  { label: "100件表示", value: "100" }
                ]}
              />
            </View>
          </Animated.View>
        )}
        {containerWidth > 0 && (
          <Animated.View
            style={[styles.view, { left: viewX }]}
            {...this.panResponder.panHandlers}
          >
            <FlatList
              style={programStyle.list}
              contentContainerStyle={[
                colorStyle.bgWhite,
                programStyle.listContents
              ]}
              data={programs}
              extraData={data}
              ref={list => {
                this.list = list;
              }}
              keyExtractor={({}, index) => String(index)}
              renderItem={({
                item: {
                  id,
                  channelName,
                  fullTitle,
                  category,
                  duration,
                  start,
                  commentCount = 0,
                  commentMaxSpeed = 0,
                  commentSpeed = 0
                },
                index
              }) => {
                const {
                  setting: { view: { countMode = "speed" } = {} }
                } = this.props;

                let count;
                switch (countMode) {
                  case "none":
                    count = null;
                    break;
                  case "comment":
                    count = commentCount;
                    break;
                  case "maxspeed":
                    count = commentMaxSpeed;
                    break;
                  case "speed":
                  default:
                    count = Math.ceil(commentSpeed * 10) / 10;
                }

                let balloonColor = "hsl(70, 100%, 50%)";
                if (commentSpeed > 200) {
                  balloonColor = "hsl(45, 100%, 50%)";
                } else if (commentSpeed > 100) {
                  balloonColor = "hsl(50, 100%, 50%)";
                } else if (commentSpeed > 50) {
                  balloonColor = "hsl(55, 100%, 50%)";
                } else if (commentSpeed > 25) {
                  balloonColor = "hsl(60, 100%, 50%)";
                } else if (commentSpeed > 10) {
                  balloonColor = "hsl(65, 100%, 50%)";
                }
                return (
                  <ListItem
                    containerStyle={
                      id === viewerProgram.id && programStyle.selected
                    }
                    titleStyle={[textStyle.bold, colorStyle.black]}
                    title={fullTitle}
                    bottomDivider
                    chevron
                    Component={TouchableOpacity}
                    subtitle={
                      <View style={[containerStyle.row, containerStyle.wrap]}>
                        <Badge
                          badgeStyle={[
                            colorStyle.borderLight,
                            { backgroundColor: category.color }
                          ]}
                          value={category.name}
                        />
                        <Text style={colorStyle.black}> {channelName} </Text>
                        <Text style={colorStyle.black}>
                          {dateFormatter.format(start, "YYYY/MM/DD A HHHH:mm")}(
                          {Math.round(duration / 60000)}分)
                        </Text>
                      </View>
                    }
                    leftElement={
                      commentCount > 0 ? (
                        <Balloon
                          wrapperStyle={programStyle.listItemLeft}
                          color={black}
                          backgroundColor={balloonColor}
                          pointing="right"
                        >
                          {count}
                        </Balloon>
                      ) : (
                        <View style={programStyle.listItemLeft} />
                      )
                    }
                    onPress={() => {
                      this.open(programs, index);
                    }}
                  />
                );
              }}
              ListHeaderComponent={
                query ? (
                  <View style={programStyle.listHeader}>
                    <Text h4 style={colorStyle.black}>
                      "{query}"の検索結果 ({hits}件)
                    </Text>
                  </View>
                ) : null
              }
              onScroll={({ nativeEvent }) => {
                const { contentOffset } = nativeEvent;
                const { headerHeight } = this.state;
                this.headerHeight += this.scrollPos - contentOffset.y;
                if (this.headerHeight > 256) {
                  this.headerHeight = 256;
                } else if (this.headerHeight < 0) {
                  this.headerHeight = 0;
                }
                headerHeight.setValue(this.headerHeight);
                this.scrollPos = contentOffset.y;
              }}
            />
            {pages.length > 1 && (
              <View
                style={[
                  containerStyle.row,
                  containerStyle.center,
                  styles.pager
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    this.setPage(1);
                  }}
                >
                  <FontAwesome5Icon
                    name="angle-double-left"
                    solid
                    style={styles.pageButton}
                    color={active}
                    size={16}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    this.setPage(this.getPage() - 1);
                  }}
                >
                  <FontAwesome5Icon
                    name="angle-left"
                    solid
                    style={styles.pageButton}
                    color={active}
                    size={16}
                  />
                </TouchableOpacity>
                <View
                  style={[
                    colorStyle.bgWhite,
                    colorStyle.borderLight,
                    styles.pagePickerWrapper
                  ]}
                >
                  <Picker
                    style={styles.pagePicker}
                    itemStyle={[
                      styles.pagePickerItem,
                      colorStyle.black as ViewStyle
                    ]}
                    selectedValue={String(page)}
                    onValueChange={page => {
                      this.setPage(parseInt(page, 10));
                    }}
                  >
                    {pages.map(page => (
                      <Picker.Item
                        key={page}
                        label={String(page)}
                        value={String(page)}
                      />
                    ))}
                  </Picker>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    this.setPage(this.getPage() + 1);
                  }}
                >
                  <FontAwesome5Icon
                    name="angle-right"
                    solid
                    style={styles.pageButton}
                    color={active}
                    size={16}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    this.setPage(Infinity);
                  }}
                >
                  <FontAwesome5Icon
                    name="angle-double-right"
                    solid
                    style={styles.pageButton}
                    color={active}
                    size={16}
                  />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    );
  }

  componentDidMount() {
    this.update({ page: 1 });
    this.load();

    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      this.bindKeys.push("up");
      Mousetrap.bind("up", () => {
        const { data, viewer } = this.props;
        const { programs = [] } = data;
        const viewerProgram = viewer.programs[viewer.index];
        if (viewerProgram) {
          const { id } = viewerProgram;
          const index = programs.findIndex(a => a.id === id);
          if (programs[index - 1]) {
            this.open(programs, index - 1);
          }
        }
      });
      this.bindKeys.push("down");
      Mousetrap.bind("down", () => {
        const { data, viewer } = this.props;
        const { programs = [] } = data;
        const viewerProgram = viewer.programs[viewer.index];
        if (viewerProgram) {
          const { id } = viewerProgram;
          const index = programs.findIndex(a => a.id === id);
          if (programs[index + 1]) {
            this.open(programs, index + 1);
          }
        }
      });
      this.bindKeys.push("left");
      Mousetrap.bind("left", () => {
        this.setPage(this.getPage() - 1);
      });
      this.bindKeys.push("right");
      Mousetrap.bind("right", () => {
        this.setPage(this.getPage() + 1);
      });
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { data, viewer } = this.props;
    if (this.list && data !== prevProps.data) {
      this.list.scrollToOffset({ offset: 0, animated: false });
    }
    if (data.query !== prevProps.data.query) {
      this.update({ page: 1 });
      this.load();
    }
    if (
      viewer !== prevProps.viewer &&
      viewer.index !== prevProps.viewer.index
    ) {
      const { programs, index } = viewer;
      const program = programs[index];
      if (program) {
        this.scrollToProgram(program);
      }
    }
  }

  componentWillUnmount() {
    clearTimeout(this.layoutCallbackId);
    if (Platform.OS === "web") {
      const Mousetrap = require("mousetrap");
      for (const key of this.bindKeys) {
        Mousetrap.unbind(key);
      }
    }
  }

  save(options = {}) {
    const { dispatch } = this.props;
    dispatch(SettingActions.update("listOptions", options));
  }

  update(data = {}) {
    const { dispatch } = this.props;
    dispatch(ProgramActions.update("list", data));
  }

  load() {
    const { dispatch } = this.props;
    dispatch(ProgramActions.load("list"));
  }

  getPage() {
    const { data } = this.props;
    const { page = 1 } = data;
    return page;
  }

  setPage(value: number) {
    let page = value;
    const { data = {}, setting } = this.props;
    const { hits = 0 } = data;
    const { listOptions = {} } = setting;
    const { view = "25" } = listOptions;

    const max = Math.ceil(hits / parseInt(view, 10));
    if (page > max) {
      page = max;
    }
    if (page < 1) {
      page = 1;
    }
    const current = this.getPage();
    if (page !== current) {
      this.update({ page });
      this.load();
    }
  }

  open(programs: ProgramListProgram[], index: number) {
    const { dispatch } = this.props;
    dispatch(ViewerActions.open(programs, index));
  }

  scrollToProgram(program: ProgramListProgram) {
    if (this.list) {
      const { data } = this.props;
      const { programs = [] } = data;
      const { id: itemId } = program;
      const item = programs.find(({ id }) => id === itemId);
      if (item) {
        this.list.scrollToItem({ item, viewPosition: 0.5 });
      }
    }
  }
}

export default connect(
  ({
    program: { list: data = {} },
    service,
    setting,
    viewer
  }: {
    program: ProgramState;
    service: ServiceState;
    setting: SettingState;
    viewer: ViewerState;
  }) => ({
    data,
    service,
    setting,
    viewer
  })
)(ProgramList);

const breakpoint = 540;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  sortPicker: {
    minWidth: 240
  },
  view: {
    flex: 1
  },
  pager: {
    bottom: 0,
    height: 96,
    left: 0,
    position: "absolute",
    right: 0
  },
  pageButton: {
    height: 32,
    lineHeight: 32,
    marginLeft: 8,
    marginRight: 8,
    textAlign: "center",
    width: 32
  },
  pagePickerWrapper: {
    borderWidth: 1,
    maxHeight: 32,
    marginLeft: 8,
    marginRight: 8,
    minWidth: 120,
    ...(Platform.OS === "ios"
      ? {
          borderWidth: 0,
          backgroundColor: "transparent",
          maxHeight: 96
        }
      : {})
  },
  pagePicker: {
    borderWidth: 0,
    flex: 1,
    maxHeight: 96
  },
  pagePickerItem: {
    fontSize: 16,
    maxHeight: 96
  }
});
