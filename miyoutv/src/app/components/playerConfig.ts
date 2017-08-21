/*!
Copyright 2016 Brazil Ltd.

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
class PlayerConfigController {
  static componentName: string = 'playerConfig';
  static $inject: string[] = [
    '$scope',
  ];
  public options: {
    playerRate: number;
    playerDeinterlace: string;
    playerAspectRatio: string;
    playerAudioTrack: number;
    playerAudioChannel: number;
    commentDuration: number;
    commentDelay: number;
    commentMaxLines: number;
    commentMaxItems: number;
  };
  public audioTrackCount: number;
  public hasSurround: boolean;
  public deinterlaceList: { [key: string]: string } = {
    無効: '',
    ブレンド: 'blend',
    Bob: 'bob',
    破棄: 'discard',
    リニア: 'linear',
    中間: 'mean',
    X: 'x',
    Yadif: 'yadif',
    'Yadif(2x)': 'yadif2x',
  };
  public aspectRatioList: { [key: string]: string } = {
    '16:9': '16:9',
    '4:3': '4:3',
    '1:1': '1:1',
    '16:10': '16:10',
    '2.21:1': '221:100',
    '2.35:1': '235:100',
    '2.39:1': '239:100',
    '5:4': '5:4',
    フル: '',
  };
  public audioTrackList: string[] = [];
  public audioChannelList: { [key: string]: number } = null;
  public playerRate: number;
  public playerDeinterlace: string;
  public playerAspectRatio: string;
  public playerAudioTrack: string;
  public playerAudioChannel: number;
  public commentDuration: number;
  public commentDelay: number;
  public commentMaxLines: number;
  public commentMaxItems: number;


  constructor(
    private $scope: ng.IScope,
  ) {
    $scope.$watch(
      (): number => this.audioTrackCount,
      (value: number): void => {
        const tracks: string[] = [];
        tracks.push('無効');
        for (let i: number = 1; i < value; i += 1) {
          tracks.push(`トラック ${i}`);
        }
        this.audioTrackList = tracks;
      },
    );
    $scope.$watch(
      (): number => this.options.playerRate,
      (value: number): void => {
        this.playerRate = Math.round(value * 100) / 100;
      },
    );
    $scope.$watch(
      (): number => this.playerRate,
      (value: number): void => {
        if (angular.isNumber(value)) {
          this.options.playerRate = value;
        }
      },
    );
    $scope.$watch(
      (): string => this.options.playerDeinterlace,
      (value: string): void => {
        this.playerDeinterlace = value;
      },
    );
    $scope.$watch(
      (): string => this.playerDeinterlace,
      (value: string): void => {
        if (angular.isString(value)) {
          this.options.playerDeinterlace = value;
        }
      },
    );

    $scope.$watch(
      (): string => this.options.playerAspectRatio,
      (value: string): void => {
        this.playerAspectRatio = value;
      },
    );
    $scope.$watch(
      (): string => this.playerAspectRatio,
      (value: string): void => {
        if (angular.isString(value)) {
          this.options.playerAspectRatio = value;
        }
      },
    );
    $scope.$watch(
      (): number => this.options.playerAudioTrack,
      (value: number): void => {
        this.playerAudioTrack = String(value >= 0 ? value : 0);
        if (value > 0) {
          this.audioChannelList = {
            ステレオ: 1,
            左: 3,
            右: 4,
            ステレオ反転: 2,
          };
          if (this.hasSurround) {
            this.audioChannelList['ドルビーサラウンド'] = 5;
          }
        } else {
          this.audioChannelList = null;
        }
      },
    );
    $scope.$watch(
      (): string => this.playerAudioTrack,
      (value: string): void => {
        if (!isNaN(value as any)) {
          this.options.playerAudioTrack = parseInt(value, 10);
        }
      },
    );
    $scope.$watch(
      (): number => this.options.playerAudioChannel,
      (value: number): void => {
        this.playerAudioChannel = value;
      },
    );
    $scope.$watch(
      (): number => this.playerAudioChannel,
      (value: number): void => {
        if (!isNaN(value)) {
          this.options.playerAudioChannel = value;
        }
      },
    );

    $scope.$watch(
      (): number => this.options.commentDuration,
      (value: number): void => {
        this.commentDuration = value / 1000;
      },
    );
    $scope.$watch(
      (): number => this.commentDuration,
      (value: number): void => {
        if (angular.isNumber(value)) {
          this.options.commentDuration = value * 1000;
        }
      },
    );

    $scope.$watch(
      (): number => this.options.commentDelay,
      (value: number): void => {
        this.commentDelay = value / 1000;
      },
    );
    $scope.$watch(
      (): number => this.commentDelay,
      (value: number): void => {
        if (angular.isNumber(value)) {
          this.options.commentDelay = value * 1000;
        }
      },
    );

    $scope.$watch(
      (): number => this.options.commentMaxLines,
      (value: number): void => {
        this.commentMaxLines = value;
      },
    );
    $scope.$watch(
      (): number => this.commentMaxLines,
      (value: number): void => {
        if (angular.isNumber(value)) {
          this.options.commentMaxLines = value;
        }
      },
    );

    $scope.$watch(
      (): number => this.options.commentMaxItems,
      (value: number): void => {
        this.commentMaxItems = value;
      },
    );
    $scope.$watch(
      (): number => this.commentMaxItems,
      (value: number): void => {
        if (angular.isNumber(value)) {
          this.options.commentMaxItems = value;
        }
      },
    );
  }
}

angular.module('app')
  .component('playerConfig', {
    templateUrl: 'templates/playerConfig.html',
    controller: PlayerConfigController,
    bindings: {
      options: '=',
      audioTrackCount: '<',
      hasSurround: '<',
    },
  });
