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
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform
} from "react-native";
import { Text, ListItem } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { StackActions } from "react-navigation";
import { connect } from "react-redux";
import { Dispatch } from "redux";

import DatePicker from "../components/DatePicker";
import IconSelector from "../components/IconSelector";
import TimePicker from "../components/TimePicker";
import colorStyle, { black, light } from "../styles/color";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import { FileActions, FileState, FileProgram } from "../modules/file";
import { ServiceState } from "../modules/service";
import { SettingActions, SettingState } from "../modules/setting";
import { ViewerActions, ViewerState } from "../modules/viewer";
import fileSelector from "../utils/fileSelector";
import DocumentPicker from "react-native-document-picker";

type Props = {
  dispatch: Dispatch;
  file: FileState;
  service: ServiceState;
  setting: SettingState & {
    fileLoader?: {
      dateFormat?: string;
    };
  };
  viewer: ViewerState;
};
type State = {
  containerWidth: number;
};
class FileLoader extends Component<Props, State> {
  list: FlatList<FileProgram> | null = null;
  state: State = {
    containerWidth: 0
  };
  layoutCallbackId?: number;

  render() {
    const { file, setting, viewer } = this.props;
    const { programs } = file;
    const { fileLoader = {} } = setting;
    const { dateFormat = "" } = fileLoader;
    const { programs: viewerPrograms, index: viewerIndex } = viewer;
    const viewerProgram = viewerPrograms[viewerIndex] || {};
    const { containerWidth } = this.state;
    return (
      <View
        style={styles.container}
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
        <View style={[containerStyle.row, colorStyle.bgDark]}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const { dispatch } = this.props;
              dispatch(StackActions.pop({}));
            }}
          >
            <FontAwesome5Icon
              name="chevron-circle-left"
              solid
              size={24}
              color={light}
            />
          </TouchableOpacity>
          <Text h4 style={[colorStyle.light, styles.title]}>
            ファイル再生
          </Text>
        </View>
        <Text h4 style={[colorStyle.black, textStyle.center]}>
          プレイリスト
        </Text>
        <View style={styles.view}>
          <FlatList
            data={programs}
            extraData={`${viewerProgram.id}_${viewerIndex}_${containerWidth}`}
            ref={ref => {
              this.list = ref;
            }}
            keyExtractor={({}, index) => String(index)}
            renderItem={({ index, item }) => {
              const { service } = this.props;
              const { commentChannels } = service;
              return (
                <ListItem
                  containerStyle={
                    index === viewerIndex &&
                    item.id === viewerProgram.id &&
                    styles.selected
                  }
                  bottomDivider
                  title={item.title}
                  subtitle={
                    <View>
                      <View
                        style={[
                          containerWidth > breakpoint
                            ? containerStyle.row
                            : containerStyle.column
                        ]}
                      >
                        <View
                          style={[colorStyle.borderGray, styles.inputWrapper]}
                        >
                          <DatePicker
                            value={item.start}
                            onChange={value => {
                              this.update(index, {
                                start: value,
                                end: value
                              });
                            }}
                          />
                        </View>
                        <View
                          style={[colorStyle.borderGray, styles.inputWrapper]}
                        >
                          <TimePicker
                            value={item.start}
                            onChange={value => {
                              this.update(index, {
                                start: value,
                                end: value
                              });
                            }}
                          />
                        </View>
                        <View
                          style={[colorStyle.borderGray, styles.inputWrapper]}
                        >
                          <IconSelector
                            icon={<FontAwesome5Icon name="tv" solid />}
                            itemStyle={styles.input}
                            items={[
                              { label: "チャンネル未設定", value: "" },
                              ...commentChannels.map(({ id }) => ({
                                label: id,
                                value: id
                              }))
                            ]}
                            selectedValue={item.channelName}
                            onValueChange={channelId => {
                              const { service } = this.props;
                              const { commentChannels } = service;
                              const channel = commentChannels.find(
                                ({ id }) => id === channelId
                              ) || { id: "", type: "" };
                              this.update(index, {
                                channel: channel.type,
                                channelName: channel.id
                              });
                            }}
                          />
                        </View>
                      </View>
                      <View style={[containerStyle.row]}>
                        <TouchableOpacity
                          style={styles.button}
                          onPress={() => {
                            this.remove(index);
                          }}
                        >
                          <FontAwesome5Icon
                            name="minus"
                            solid
                            size={24}
                            color={black}
                          />
                        </TouchableOpacity>
                        <View style={styles.spacer} />
                        <TouchableOpacity
                          style={[styles.button]}
                          onPress={() => {
                            this.open(index);
                          }}
                        >
                          <FontAwesome5Icon
                            name="play"
                            solid
                            size={24}
                            color={black}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  }
                />
              );
            }}
          />
        </View>
        <View style={[containerStyle.row, containerStyle.center]}>
          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              const uris = await fileSelector({
                multiSelections: true,
                type: Platform.select({
                  web: [
                    {
                      name: "Movies",
                      extensions: ["mp4", "mkv", "m2ts", "ts"]
                    },
                    { name: "All", extensions: ["*"] }
                  ],
                  default: [
                    DocumentPicker.types.video,
                    DocumentPicker.types.allFiles
                  ]
                })
              });
              if (uris) {
                this.add(uris);
              }
            }}
          >
            <FontAwesome5Icon name="plus" solid color={black} size={24} />
          </TouchableOpacity>
        </View>
        <View
          style={[
            containerStyle.row,
            containerStyle.right,
            containerStyle.wrap
          ]}
        >
          <Text style={[colorStyle.black, styles.label]}>
            日時取得フォーマット
          </Text>
          <View
            style={[
              colorStyle.bgWhite,
              colorStyle.borderGray,
              styles.inputWrapper
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="YYMMDDHHmm"
              value={dateFormat}
              onChangeText={dateFormat => {
                const { dispatch } = this.props;
                dispatch(SettingActions.update("fileLoader", { dateFormat }));
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  componentDidUpdate(prevProps: Props) {
    const { file, viewer } = this.props;
    const { programs } = file;
    const { programs: prevPrograms } = prevProps.file;
    if (viewer.isOpened && !viewer.playing && programs !== prevPrograms) {
      const { index } = viewer;
      this.open(index);
    }

    if (
      viewer !== prevProps.viewer ||
      viewer.index !== prevProps.viewer.index
    ) {
      const { programs, index } = viewer;
      const program = programs[index];
      if (program) {
        this.scrollToProgram(program);
      }
    }
    if (programs.length > prevPrograms.length && this.list) {
      this.list.scrollToEnd();
    }
  }

  add(uris: string[]) {
    const { dispatch } = this.props;
    dispatch(FileActions.add(uris));
  }

  update(index: number, values: any) {
    const { dispatch } = this.props;
    dispatch(FileActions.update(index, values));
  }

  remove(index: number) {
    const { dispatch } = this.props;
    dispatch(FileActions.remove(index));
  }

  open(index: number) {
    const { dispatch, file } = this.props;
    const { programs } = file;
    dispatch(ViewerActions.open(programs, index));
  }

  scrollToProgram(program: FileProgram) {
    if (this.list) {
      const { file } = this.props;
      const { programs = [] } = file;
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
    file,
    service,
    setting,
    viewer
  }: {
    file: FileState;
    service: ServiceState;
    setting: SettingState;
    viewer: ViewerState;
  }) => ({
    file,
    service,
    setting,
    viewer
  })
)(FileLoader);

const breakpoint = 540;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  title: {
    flex: 1,
    height: 40,
    lineHeight: 40,
    marginHorizontal: 16,
    overflow: "hidden"
  },
  button: {
    alignItems: "center",
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  view: {
    flex: 1
  },
  spacer: {
    flex: 1
  },
  label: {
    fontSize: 16
  },
  inputWrapper: {
    borderWidth: 1,
    minWidth: 180
  },
  input: {
    fontSize: 16
  },
  selected: {
    backgroundColor: "#9991ff66"
  }
});
