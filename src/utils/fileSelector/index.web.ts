/*!
Copyright 2016-2022 Brazil Ltd.
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

export default async function fileSelector({
  title,
  buttonLabel,
  type: filters,
  multiSelections
}: {
  title?: string;
  buttonLabel?: string;
  type?: { name: string; extensions: string[] }[];
  multiSelections?: boolean;
}) {
  const properties: "multiSelections"[] = [];
  if (multiSelections) {
    properties.push("multiSelections");
  }
  const { canceled, filePaths } = await window.dialog.showOpenDialog({
    title,
    buttonLabel,
    filters,
    properties
  });

  if (canceled) {
    return;
  }
  return filePaths.map(path => `file://${path}`);
}
