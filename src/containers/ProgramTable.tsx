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
  ScrollView,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
  PanResponderInstance
} from "react-native";
import { Text, CheckBox, Badge } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { Menu, MenuTrigger, MenuOptions } from "react-native-popup-menu";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import Balloon from "../components/Balloon";
import DatePicker from "../components/DatePicker";
import IconSelector from "../components/IconSelector";
import colorStyle, {
  active,
  black,
  dark,
  grayDark,
  light
} from "../styles/color";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import programStyle from "../styles/program";
import {
  ProgramActions,
  ProgramState,
  ProgramTableData
} from "../modules/program";
import { ServiceState } from "../modules/service";
import { SettingActions, SettingState } from "../modules/setting";
import DateFormatter from "../utils/DateFormatter";
import { categoryTable } from "../config/constants";

type Props = {
  dispatch: Dispatch;
  data: ProgramTableData;
  service: ServiceState;
  setting: SettingState & {
    tableOptions?: {
      categories?: string[];
    };
    view?: {
      countMode?: string;
      hourFirst?: string;
      hourFormat?: string;
    };
    useArchive?: boolean;
  };
};
type State = {
  containerWidth: number;
  headerHeight: Animated.AnimatedValue;
  viewX: Animated.AnimatedValue;
};
class ProgramTable extends Component<Props, State> {
  view: ScrollView | null = null;
  panResponder: PanResponderInstance;
  state = {
    containerWidth: 0,
    headerHeight: new Animated.Value(256),
    viewX: new Animated.Value(0)
  };
  layoutCallbackId?: number;
  scrollPos = 0;
  headerHeight = 256;

  constructor(props: Props) {
    super(props);
    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: ({}, { dx }) => Math.abs(dx) > 10,
      onPanResponderMove: Animated.event([null, { dx: this.state.viewX }], {}),
      onPanResponderEnd: ({}, { dx }) => {
        const { viewX } = this.state;
        const { data = {} } = this.props;
        const { columns = [], offset = 0 } = data;
        viewX.setValue(0);
        if (Math.abs(dx) > 200) {
          this.update({
            offset:
              (columns.length + offset - Math.floor(dx / 200)) % columns.length
          });
        }
      }
    });
  }

  render() {
    const { data, service, setting } = this.props;
    const {
      columns = [],
      maxDate,
      minDate,
      offset = 0,
      start = new Date()
    } = data;
    const { archiveActive } = service;
    const {
      tableOptions = {},
      view: viewSetting = {},
      useArchive = true
    } = setting;
    const { categories = [] } = tableOptions;
    const {
      countMode = "speed",
      hourFirst = "4",
      hourFormat = ""
    } = viewSetting;
    const { containerWidth, headerHeight, viewX } = this.state;

    const dateFormatter = new DateFormatter(
      parseInt(hourFirst, 10),
      hourFormat
    );

    const hours = [];
    for (let i = 0; i < 24; i++) {
      const hour = new Date(maxDate || Date.now());
      hour.setHours(parseInt(hourFirst, 10) + i);
      hours.push(hour);
    }

    const length =
      Platform.OS === "web"
        ? Math.floor((containerWidth - 49) / 200)
        : Math.floor((containerWidth - 32) / 200);
    const tableColumns = [];
    for (let i = 0; i < columns.length; i++) {
      let index = (i + offset) % columns.length;
      if (index < 0) {
        index += columns.length;
      }
      tableColumns.push(columns[index]);
      if (tableColumns.length >= length) {
        break;
      }
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
                  : [programStyle.headerRow]
              }
            >
              {archiveActive && (
                <IconSelector
                  containerStyle={[
                    colorStyle.bgDark,
                    colorStyle.borderGrayDark,
                    programStyle.headerControl
                  ]}
                  icon={
                    <FontAwesome5Icon name="database" solid color={light} />
                  }
                  style={[colorStyle.bgDark, colorStyle.light as ViewStyle]}
                  itemStyle={colorStyle.light}
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
            </View>
            <View
              style={
                containerWidth > breakpoint
                  ? [
                      containerStyle.row,
                      containerStyle.wrap,
                      containerStyle.center,
                      programStyle.headerColumn
                    ]
                  : [programStyle.headerRow]
              }
            >
              <DatePicker
                containerStyle={[
                  colorStyle.borderGrayDark,
                  programStyle.headerControl
                ]}
                color={light}
                backgroundColor={dark}
                maxDate={maxDate}
                minDate={minDate}
                value={new Date(start)}
                onChange={start => {
                  this.update({ start });
                  this.load();
                }}
              />
            </View>
            <View
              style={
                containerWidth > breakpoint
                  ? [
                      containerStyle.row,
                      containerStyle.wrap,
                      containerStyle.right,
                      programStyle.headerColumn
                    ]
                  : [programStyle.headerRow]
              }
            >
              <Menu>
                <MenuTrigger
                  customStyles={{
                    triggerOuterWrapper: [
                      colorStyle.bgDark,
                      colorStyle.borderGrayDark,
                      programStyle.headerControl
                    ],
                    triggerWrapper: [
                      containerStyle.row,
                      colorStyle.bgDark,
                      styles.menuButton
                    ]
                  }}
                >
                  <View style={styles.menuButtonIcon}>
                    <FontAwesome5Icon
                      name="filter"
                      solid
                      color={categories.length > 0 ? active : light}
                    />
                  </View>
                  <Text style={[colorStyle.light, styles.menuButtonText]}>
                    カテゴリ選択
                  </Text>
                </MenuTrigger>
                <MenuOptions
                  customStyles={{
                    optionsWrapper: colorStyle.bgBlack
                  }}
                >
                  <ScrollView style={styles.menuView}>
                    {categoryTable.map(({ code, name }) => (
                      <CheckBox
                        key={code}
                        containerStyle={[
                          colorStyle.bgDark,
                          colorStyle.borderGrayDark,
                          styles.menuCheckbox
                        ]}
                        textStyle={colorStyle.light}
                        title={name}
                        checked={categories.indexOf(String(code)) >= 0}
                        onPress={() => {
                          if (categories.indexOf(String(code)) >= 0) {
                            this.save({
                              categories: categories.filter(
                                a => a !== String(code)
                              )
                            });
                          } else {
                            this.save({
                              categories: [...categories, String(code)]
                            });
                          }
                        }}
                      />
                    ))}
                  </ScrollView>
                </MenuOptions>
              </Menu>
            </View>
          </Animated.View>
        )}
        {containerWidth > 0 && (
          <Animated.View
            style={[styles.view, { left: viewX }]}
            {...this.panResponder.panHandlers}
          >
            <View
              style={[
                containerStyle.row,
                containerStyle.center,
                colorStyle.bgDark,
                styles.channelHeader
              ]}
            >
              {tableColumns.map(({ channelName }, index) => (
                <View
                  key={index}
                  style={[colorStyle.borderGrayDark, styles.channelCell]}
                >
                  <Text style={[textStyle.center, colorStyle.light]}>
                    {channelName}
                  </Text>
                </View>
              ))}
              <TouchableOpacity
                style={styles.buttonLeft}
                onPress={() => {
                  const { data = {} } = this.props;
                  const { columns = [], offset = 0 } = data;
                  this.update({
                    offset: (columns.length + offset - 1) % columns.length
                  });
                }}
              >
                <FontAwesome5Icon
                  name="chevron-left"
                  solid
                  style={styles.icon}
                  color={light}
                  size={16}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.buttonRight}
                onPress={() => {
                  const { data = {} } = this.props;
                  const { columns = [], offset = 0 } = data;
                  this.update({
                    offset: (offset + 1) % columns.length
                  });
                }}
              >
                <FontAwesome5Icon
                  name="chevron-right"
                  solid
                  style={styles.icon}
                  color={light}
                  size={16}
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.tableView}
              contentContainerStyle={containerStyle.row}
              scrollEventThrottle={16}
              ref={view => {
                this.view = view;
              }}
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
            >
              <View style={[colorStyle.bgDark, styles.hourHeader]}>
                {hours.map((hour, index) => (
                  <View key={index} style={styles.hourCell}>
                    <Text
                      key={index}
                      style={[textStyle.center, colorStyle.light]}
                    >
                      {dateFormatter.getHour(hour)}
                    </Text>
                  </View>
                ))}
                {(!minDate ||
                  start.getFullYear() > minDate.getFullYear() ||
                  start.getMonth() > minDate.getMonth() ||
                  start.getDate() > minDate.getDate()) && (
                  <TouchableOpacity
                    style={styles.buttonTop}
                    onPress={() => {
                      this.previous();
                    }}
                  >
                    <FontAwesome5Icon
                      name="chevron-up"
                      solid
                      style={styles.icon}
                      color={light}
                      size={16}
                    />
                  </TouchableOpacity>
                )}
                {(!maxDate ||
                  start.getFullYear() < maxDate.getFullYear() ||
                  start.getMonth() < maxDate.getMonth() ||
                  start.getDate() < maxDate.getDate()) && (
                  <TouchableOpacity
                    style={styles.buttonBottom}
                    onPress={() => {
                      this.next();
                    }}
                  >
                    <FontAwesome5Icon
                      name="chevron-down"
                      solid
                      style={styles.icon}
                      color={light}
                      size={16}
                    />
                  </TouchableOpacity>
                )}
              </View>
              {tableColumns.map(({ programs = [] }, index) => (
                <View key={index} style={styles.tableColumn}>
                  {programs
                    .filter(
                      ({ category }) =>
                        categories.length < 1 ||
                        categories.indexOf(String(category.code)) >= 0
                    )
                    .map(
                      (
                        {
                          start,
                          fullTitle,
                          detail,
                          category,
                          position = 0,
                          size = 0
                        },
                        index
                      ) => (
                        <View
                          key={index}
                          style={[
                            colorStyle.bgWhite,
                            colorStyle.borderLight,
                            styles.tableCellWrapper,
                            {
                              top: position * hourSize,
                              height: size * hourSize
                            }
                          ]}
                        >
                          <TouchableOpacity style={styles.tableCell}>
                            <View
                              style={[containerStyle.row, containerStyle.wrap]}
                            >
                              <Text style={[textStyle.bold, colorStyle.black]}>
                                <Text style={colorStyle.active}>
                                  {dateFormatter.format(start, "HHHH:mm")}
                                </Text>{" "}
                                {fullTitle}
                              </Text>
                              <Badge
                                badgeStyle={[
                                  colorStyle.borderLight,
                                  { backgroundColor: category.color }
                                ]}
                                value={category.name}
                              />
                            </View>
                            <Text style={colorStyle.black}>{detail}</Text>
                          </TouchableOpacity>
                        </View>
                      )
                    )}
                  {countMode !== "none" &&
                    programs
                      .filter(
                        ({ category }) =>
                          !categories ||
                          categories.length <= 0 ||
                          categories.indexOf(String(category.code)) >= 0
                      )
                      .map(
                        (
                          {
                            commentCount = 0,
                            commentSpeed = 0,
                            commentMaxSpeed = 0,
                            position = 0
                          },
                          index: number
                        ) => {
                          let count;
                          if (!commentCount) {
                            return null;
                          }
                          switch (countMode) {
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
                          let top = position * hourSize - 16;
                          if (top < 0) {
                            top = 0;
                          }
                          return (
                            <Balloon
                              key={index}
                              wrapperStyle={{
                                position: "absolute",
                                right: 0,
                                top
                              }}
                              color={black}
                              backgroundColor={balloonColor}
                              pointing="left"
                            >
                              {count}
                            </Balloon>
                          );
                        }
                      )}
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </View>
    );
  }

  componentDidMount() {
    this.load();
  }

  componentWillUnmount() {
    clearTimeout(this.layoutCallbackId);
  }

  save(options = {}) {
    const { dispatch } = this.props;
    dispatch(SettingActions.update("tableOptions", options));
  }

  update(data = {}) {
    const { dispatch } = this.props;
    dispatch(ProgramActions.update("table", data));
  }

  load() {
    const { dispatch } = this.props;
    dispatch(ProgramActions.load("table"));
  }

  previous() {
    const { data = {} } = this.props;
    const { minDate, start = new Date() } = data;
    const date = new Date(start);
    date.setDate(date.getDate() - 1);
    if (!minDate || date.getTime() > new Date(minDate).getTime()) {
      this.update({
        start: date
      });
      this.load();
      if (this.view) {
        this.view.scrollToEnd({ animated: false });
      }
    }
  }

  next() {
    const { data = {} } = this.props;
    const { maxDate, start = new Date() } = data;
    const date = new Date(start);
    date.setDate(date.getDate() + 1);
    if (!maxDate || date.getTime() < new Date(maxDate).getTime()) {
      this.update({
        start: date
      });
      this.load();
      if (this.view) {
        this.view.scrollTo({ y: 0, animated: false });
      }
    }
  }
}

export default connect(
  ({
    program: { table: data = {} },
    service,
    setting
  }: {
    program: ProgramState;
    service: ServiceState;
    setting: SettingState;
  }) => ({
    data,
    service,
    setting
  })
)(ProgramTable);

const breakpoint = 540;
const hourSize = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  menuButton: {
    height: 32
  },
  menuButtonIcon: {
    alignItems: "center",
    width: 32
  },
  menuButtonText: {
    paddingLeft: 8
  },
  menuView: {
    maxHeight: hourSize
  },
  menuCheckbox: {
    borderRadius: 0,
    margin: 0,
    marginLeft: 0,
    marginRight: 0
  },
  view: {
    flex: 1
  },
  channelHeader: {
    alignItems: "stretch",
    height: 32,
    paddingLeft: 32,
    paddingRight: Platform.OS === "web" ? 17 : 0
  },
  channelCell: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    flex: 1,
    justifyContent: "center",
    overflow: "hidden"
  },
  hourHeader: {
    width: 32,
    height: hourSize * 24
  },
  hourCell: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: 1,
    borderTopColor: grayDark,
    borderTopWidth: 1,
    flex: 1,
    justifyContent: "center",
    overflow: "hidden"
  },
  tableView: {
    flex: 1
  },
  tableColumn: {
    flex: 1,
    height: hourSize * 24
  },
  tableCellWrapper: {
    borderWidth: 1,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0
  },
  tableCell: {
    flex: 1
  },
  icon: {
    height: 32,
    lineHeight: 32,
    textAlign: "center",
    width: 32
  },
  buttonLeft: {
    position: "absolute",
    top: 0,
    left: 32
  },
  buttonRight: {
    position: "absolute",
    right: Platform.OS === "web" ? 17 : 0,
    top: 0
  },
  buttonTop: {
    position: "absolute",
    left: 0,
    top: 0
  },
  buttonBottom: {
    bottom: 0,
    position: "absolute",
    left: 0
  }
});
