import { ManifestProvider } from '@bigid/apps-infrastructure-node-js';
import { readFileSync } from "fs";
import { resolve } from "path";
import { Response, Request } from 'express';

class ManifestController extends ManifestProvider {
  getManifest(req: Request, res: Response): Response {
    return res.status(200).json(JSON.parse(readFileSync(resolve("resources/manifest.json"),'utf8')));
  }
}

export const manifestController = new ManifestController();