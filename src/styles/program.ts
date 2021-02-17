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

import { StyleSheet } from "react-native";

const programStyle = StyleSheet.create({
  headerRow: {},
  headerRowRevese: {
    flexDirection: "column-reverse"
  },
  headerColumn: {
    alignSelf: "flex-start",
    flex: 1
  },
  headerColumnReverse: {
    alignSelf: "flex-end",
    flexWrap: "wrap-reverse"
  },
  headerContent: {
    height: 32,
    margin: 2,
    minWidth: 200
  },
  headerControl: {
    borderWidth: 1,
    margin: 1,
    minWidth: 200
  },
  list: {
    flex: 1
  },
  listContents: {
    minHeight: "100%",
    paddingBottom: 96
  },
  listItemLeft: {
    alignSelf: "flex-start",
    minWidth: 48
  },
  listHeader: {
    paddingLeft: 16,
    paddingRight: 16
  }
});
export default programStyle;
