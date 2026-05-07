export class Activation {
  private activated = false

  async activate(_key: string): Promise<boolean> {
    this.activated = true
    return true
  }

  isActivated(): boolean {
    return this.activated
  }
}
