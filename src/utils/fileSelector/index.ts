/*!
Copyright 2016-2023 Brazil Ltd.
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

import DocumentPicker from "react-native-document-picker";

export default async function fileSelector({
  type = [DocumentPicker.types.allFiles],
  multiSelections
}: {
  title?: string;
  buttonLabel?: string;
  type?: any[];
  multiSelections?: boolean;
}) {
  try {
    const result = await DocumentPicker.pick({
      type,
      copyTo: "cachesDirectory",
      allowMultiSelection: multiSelections
    });

    return result.map(({ fileCopyUri, uri }) => fileCopyUri?.replace(/file:\/*/, "file:///") || uri);
  } catch (e) {
    if (DocumentPicker.isCancel(e)) {
      return;
    }
    throw e;
  }
}
