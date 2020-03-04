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

import React, { memo, useCallback, useMemo } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { Card, Text, Badge } from "react-native-elements";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";
import { useDispatch, useSelector, shallowEqual } from "react-redux";

import DateFormatter from "../utils/DateFormatter";
import colorStyle, { light } from "../styles/color";
import containerStyle from "../styles/container";
import textStyle from "../styles/text";
import { RootState } from "../modules";
import { SettingState } from "../modules/setting";
import { ViewerActions, ViewerProgram } from "../modules/viewer";

type Setting = SettingState & {
  view?: {
    hourFirst?: string;
    hourFormat?: string;
  };
};
type State = RootState & {
  setting: Setting;
};

const ViewerInfo = memo(() => {
  const hourFirst = useSelector<State, number>(({ setting }) =>
    parseInt(setting.view?.hourFirst || "4", 10)
  );
  const hourFormat = useSelector<State, string>(
    ({ setting }) => setting.view?.hourFormat || ""
  );
  const program = useSelector<State, ViewerProgram | undefined>(
    ({ viewer }) => viewer.programs[viewer.index],
    shallowEqual
  );
  const extraProgram = useSelector<State, ViewerProgram | undefined>(
    ({ viewer }) =>
      viewer.programs[viewer.index]?.recorded?.[viewer.extraIndex],
    shallowEqual
  );

  const dateFormatter = useMemo(
    () => new DateFormatter(hourFirst, hourFormat),
    [hourFirst, hourFormat]
  );

  return (
    <ScrollView style={styles.container}>
      {program &&
        (program.type === "file" ? (
          <FileCard dateFormatter={dateFormatter} {...program} />
        ) : (
          <ProgramCard dateFormatter={dateFormatter} {...program} />
        ))}
      {extraProgram && (
        <ExtraProgramCard dateFormatter={dateFormatter} {...extraProgram} />
      )}
    </ScrollView>
  );
});
export default ViewerInfo;

const FileCard = memo(
  ({
    id,
    channelName,
    fullTitle,
    start,
    stream,
    dateFormatter = new DateFormatter()
  }: ViewerProgram & {
    dateFormatter?: DateFormatter;
  }) => (
    <Card
      containerStyle={[colorStyle.bgDark, colorStyle.borderGrayDark]}
      dividerStyle={colorStyle.bgGrayDark}
      titleStyle={colorStyle.light}
      title="ファイル情報"
    >
      <View style={[containerStyle.row, styles.cardRow]}>
        <View style={styles.cardLabel}>
          <Text style={colorStyle.light}>ID</Text>
        </View>
        <View style={[containerStyle.row, styles.cardContent]}>
          <Text style={colorStyle.light}>{id}</Text>
        </View>
      </View>
      <View style={[containerStyle.row, styles.cardRow]}>
        <View style={styles.cardLabel}>
          <Text style={colorStyle.light}>ファイル名</Text>
        </View>
        <View style={[containerStyle.row, styles.cardContent]}>
          <Text style={colorStyle.light}>{fullTitle}</Text>
        </View>
      </View>
      <View style={[containerStyle.row, styles.cardRow]}>
        <View style={styles.cardLabel}>
          <Text style={colorStyle.light}>日時</Text>
        </View>
        <View style={[containerStyle.row, styles.cardContent]}>
          <Text style={colorStyle.light}>
            {dateFormatter.format(start, "YYYY/MM/DD A HHHH:mm")}
          </Text>
        </View>
      </View>
      <View style={[containerStyle.row, styles.cardRow]}>
        <View style={styles.cardLabel}>
          <Text style={colorStyle.light}>チャンネル</Text>
        </View>
        <View style={[containerStyle.row, styles.cardContent]}>
          <Text style={colorStyle.light}>{channelName || "未設定"}</Text>
        </View>
      </View>
      <View style={[containerStyle.row, styles.cardRow]}>
        <View style={styles.cardLabel}>
          <Text style={colorStyle.light}>URI</Text>
        </View>
        <View style={[containerStyle.row, styles.cardContent]}>
          <Text style={colorStyle.light}>{stream}</Text>
        </View>
      </View>
    </Card>
  )
);

const ProgramCard = memo(
  ({
    id,
    type,
    channel,
    channelName,
    title,
    fullTitle,
    detail,
    category,
    start,
    end,
    commentCount,
    commentSpeed,
    commentMaxSpeed,
    commentMaxSpeedTime,
    dateFormatter = new DateFormatter()
  }: ViewerProgram & {
    dateFormatter: DateFormatter;
  }) => {
    const dispatch = useDispatch();

    const titleSearch = useCallback(() => {
      dispatch(ViewerActions.search(title));
    }, [title]);
    const channelSearch = useCallback(() => {
      dispatch(ViewerActions.search(`type:${type} ch:${channel}`));
    }, [type, channel]);
    const categorySearch = useCallback(() => {
      dispatch(ViewerActions.search(`cat:${category.codeName}`));
    }, [category]);

    return (
      <Card
        containerStyle={[colorStyle.bgDark, colorStyle.borderGrayDark]}
        dividerStyle={colorStyle.bgGrayDark}
        titleStyle={colorStyle.light}
        title="番組情報"
      >
        <View style={[containerStyle.row, styles.cardRow]}>
          <View style={[containerStyle.row, styles.cardContent]}>
            <Text style={[textStyle.bold, colorStyle.light]}>{fullTitle}</Text>
            <FontAwesome5Icon
              name="search"
              solid
              style={styles.icon}
              color={light}
              onPress={titleSearch}
            />
          </View>
        </View>
        <View style={[containerStyle.row, styles.cardRow]}>
          <View style={styles.cardLabel}>
            <Text style={colorStyle.light}>ID</Text>
          </View>
          <View style={[containerStyle.row, styles.cardContent]}>
            <Text style={colorStyle.light}>{id}</Text>
          </View>
        </View>
        <View style={[containerStyle.row, styles.cardRow]}>
          <View style={styles.cardLabel}>
            <Text style={colorStyle.light}>開始日時</Text>
          </View>
          <View style={[containerStyle.row, styles.cardContent]}>
            <Text style={colorStyle.light}>
              {dateFormatter.format(start, "YYYY/MM/DD A HHHH:mm")}
            </Text>
          </View>
        </View>
        <View style={[containerStyle.row, styles.cardRow]}>
          <View style={styles.cardLabel}>
            <Text style={colorStyle.light}>終了日時</Text>
          </View>
          <View style={[containerStyle.row, styles.cardContent]}>
            <Text style={colorStyle.light}>
              {dateFormatter.format(end, "YYYY/MM/DD A HHHH:mm")}
            </Text>
          </View>
        </View>
        <View style={[containerStyle.row, styles.cardRow]}>
          <View style={styles.cardLabel}>
            <Text style={colorStyle.light}>チャンネル</Text>
          </View>
          <View style={[containerStyle.row, styles.cardContent]}>
            <Text style={colorStyle.light}>{channelName}</Text>
            <FontAwesome5Icon
              name="search"
              solid
              style={styles.icon}
              color={light}
              onPress={channelSearch}
            />
          </View>
        </View>
        <View style={[containerStyle.row, styles.cardRow]}>
          <View style={styles.cardLabel}>
            <Text style={colorStyle.light}>カテゴリー</Text>
          </View>
          <View style={[containerStyle.row, styles.cardContent]}>
            <Badge
              badgeStyle={[
                colorStyle.borderGrayDark,
                styles.badge,
                {
                  backgroundColor: category.color
                }
              ]}
              value={category.name}
            />
            <FontAwesome5Icon
              name="search"
              solid
              style={styles.icon}
              color={light}
              onPress={categorySearch}
            />
          </View>
        </View>
        <View style={[containerStyle.row, styles.cardRow]}>
          <View style={[containerStyle.row, styles.cardContent]}>
            <Text style={colorStyle.light}>{detail}</Text>
          </View>
        </View>
        {commentCount != null && (
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={colorStyle.light}>コメント数</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={colorStyle.light}>{commentCount}</Text>
            </View>
          </View>
        )}
        {commentSpeed != null && (
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={colorStyle.light}> 平均</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={colorStyle.light}>
                {Math.ceil((commentSpeed || 0) * 10) / 10}
                コメント/分
              </Text>
            </View>
          </View>
        )}
        {commentMaxSpeedTime && (
          <View style={[containerStyle.row, styles.cardRow]}>
            <View style={styles.cardLabel}>
              <Text style={colorStyle.light}> ピーク</Text>
            </View>
            <View style={[containerStyle.row, styles.cardContent]}>
              <Text style={colorStyle.light}>
                {commentMaxSpeed || 0}コメント/分 (
                {dateFormatter.format(commentMaxSpeedTime, "HHHH:mm")})
              </Text>
            </View>
          </View>
        )}
      </Card>
    );
  }
);

const ExtraProgramCard = memo(
  ({
    id,
    fullTitle,
    channelName,
    start,
    end,
    dateFormatter = new DateFormatter()
  }: ViewerProgram & {
    dateFormatter?: DateFormatter;
  }) => (
    <Card
      containerStyle={[colorStyle.bgDark, colorStyle.borderGrayDark]}
      dividerStyle={colorStyle.bgGrayDark}
      titleStyle={colorStyle.light}
      title="録画情報"
    >
      <View style={[containerStyle.row, styles.cardRow]}>
        <View style={styles.cardLabel}>
          <Text style={colorStyle.light}>ID</Text>
        </View>
        <View style={[containerStyle.row, styles.cardContent]}>
          <Text style={colorStyle.light}>{id}</Text>
        </View>
      </View>
      <View style={[containerStyle.row, styles.cardRow]}>
        <View style={styles.cardLabel}>
          <Text style={colorStyle.light}>タイトル</Text>
        </View>
        <View style={[containerStyle.row, styles.cardContent]}>
          <Text style={colorStyle.light}>{fullTitle}</Text>
        </View>
      </View>
      <View style={[containerStyle.row, styles.cardRow]}>
        <View style={styles.cardLabel}>
          <Text style={colorStyle.light}>チャンネル</Text>
        </View>
        <View style={[containerStyle.row, styles.cardContent]}>
          <Text style={colorStyle.light}>{channelName}</Text>
        </View>
      </View>
      <View style={[containerStyle.row, styles.cardRow]}>
        <View style={styles.cardLabel}>
          <Text style={colorStyle.light}>開始日時</Text>
        </View>
        <View style={[containerStyle.row, styles.cardContent]}>
          <Text style={colorStyle.light}>
            {dateFormatter.format(start, "YYYY/MM/DD A HHHH:mm")}
          </Text>
        </View>
      </View>
      <View style={[containerStyle.row, styles.cardRow]}>
        <View style={styles.cardLabel}>
          <Text style={colorStyle.light}>終了日時</Text>
        </View>
        <View style={[containerStyle.row, styles.cardContent]}>
          <Text style={colorStyle.light}>
            {dateFormatter.format(end, "YYYY/MM/DD A HHHH:mm")}
          </Text>
        </View>
      </View>
    </Card>
  )
);

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  cardRow: {
    alignItems: "flex-start",
    padding: 1
  },
  cardLabel: {
    flex: 1
  },
  cardContent: {
    flex: 2
  },
  badge: {
    alignSelf: "flex-start"
  },
  icon: {
    padding: 5
  }
});
