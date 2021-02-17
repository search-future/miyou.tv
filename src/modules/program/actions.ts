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

export const PROGRAM_INIT = "PROGRAM_INIT";
function init() {
  return {
    type: PROGRAM_INIT
  };
}

export const PROGRAM_LOAD = "PROGRAM_LOAD";
function load(module?: string) {
  return {
    type: PROGRAM_LOAD,
    module
  };
}

export const PROGRAM_UPDATE = "PROGRAM_UPDATE";
function update(key: string, data: any) {
  return {
    type: PROGRAM_UPDATE,
    key,
    data
  };
}

export const ProgramActions = {
  init,
  load,
  update
};
