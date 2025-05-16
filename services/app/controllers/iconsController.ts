import { IconsProviders } from '@bigid/apps-infrastructure-node-js';
import { resolve } from "path";

export class IconsController extends IconsProviders {
  getIconPath(): string {
    return resolve("resources/icon.png");
  }

  getSideBarIconPath(): string {
    return resolve("resources/side-bar-icon.png");
  }
}

export const iconsController = new IconsController();