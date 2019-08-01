export class BooleanSetting {
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
