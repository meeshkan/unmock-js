/**
 * Boolean setting. Used to maintain on-off state.
 */
export interface IBooleanSetting {
  on(): void;
  off(): void;
  get(): boolean;
}

export class BooleanSetting implements IBooleanSetting {
  constructor(private value = false) {}
  public on() {
    this.value = true;
  }
  public off() {
    this.value = false;
  }
  public get() {
    return this.value;
  }
}
