/*!
Copyright 2016-2018 Brazil Ltd.

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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Subscription } from 'rxjs';

import { Player } from './player.service';

@Component({
  selector: 'player-config',
  templateUrl: 'player-config.component.html',
})
export class PlayerConfigComponent implements OnInit, OnDestroy {
  public playerForm: FormGroup;
  public videoForm: FormGroup;
  public audioForm: FormGroup;
  public audioTrackList: { name: string, value: number }[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private formBuilder: FormBuilder,
    public player: Player,
  ) { }

  ngOnInit() {
    this.playerForm = this.formBuilder.group({
      rate: [this.player.rate],
    });
    this.videoForm = this.formBuilder.group({
      deinterlace: [this.player.deinterlace],
      aspectRatio: [this.player.aspectRatio],
    });
    this.audioForm = this.formBuilder.group({
      track: [this.player.audioTrack],
      channel: [this.player.audioChannel],
    });
    this.subscriptions.push(
      this.playerForm.valueChanges.subscribe((data: any) => {
        const rate: number = Math.round(data.rate * 100) / 100;
        if (!isNaN(rate) && rate !== this.player.rate) {
          this.player.rate = rate;
        }
      }),
      this.videoForm.valueChanges.subscribe((data: any) => {
        if (data.deinterlace !== this.player.deinterlace) {
          this.player.deinterlace = data.deinterlace;
        }
        if (data.aspectRatio !== this.player.aspectRatio) {
          this.player.aspectRatio = data.aspectRatio;
        }
      }),
      this.audioForm.valueChanges.subscribe((data: any) => {
        const track: number = parseInt(data.track, 10);
        const channel: number = parseInt(data.channel, 10);
        if (!isNaN(track) && track !== this.player.audioTrack) {
          this.player.audioTrack = track;
        }
        if (!isNaN(channel) && channel !== this.player.audioChannel) {
          this.player.audioChannel = channel;
        }
      }),
      this.player.valueChanges.subscribe((data: any) => {
        const options: any = { emitEvent: false };
        if (data.rate != null) {
          this.playerForm.patchValue(
            { rate: Math.round(data.rate * 10) / 10 },
            options,
          );
        }
        if (data.deinterlace != null) {
          this.videoForm.patchValue(
            { deinterlace: data.deinterlace },
            options,
          );
        }
        if (data.aspectRatio != null) {
          this.videoForm.patchValue(
            { aspectRatio: data.aspectRatio },
            options,
          );
        }
        if (data.audioTrack != null) {
          const audioTrackList: { name: string, value: number }[] = [];
          if (this.player.audioTrackCount > 0) {
            audioTrackList.push({ name: '無効', value: -1 });
            for (let i: number = 1; i < this.player.audioTrackCount; i += 1) {
              audioTrackList.push({
                name: `トラック ${i}`,
                value: i,
              });
            }
          }
          this.audioTrackList = audioTrackList;
          this.audioForm.patchValue(
            {
              track: this.player.audioTrack,
              channel: this.player.audioChannel,
            },
            options,
          );
        }
        if (data.audioChannel > 0) {
          this.audioForm.patchValue(
            { channel: data.audioChannel },
            options,
          );
        }
      }),
    );
  }

  public ngOnDestroy() {
    this.subscriptions.forEach((a: Subscription) => {
      a.unsubscribe();
    });
  }
}
