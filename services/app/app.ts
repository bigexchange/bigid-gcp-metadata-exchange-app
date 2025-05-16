import { deployServer } from '@bigid/apps-infrastructure-node-js';
import { manifestController } from "./controllers/manifestController";
import { iconsController } from "./controllers/iconsController";
import { executionController } from "./controllers/executeController";

const serverPort = +(process.env.PORT || 8085);

deployServer({ manifestController, iconsController, executionController, serverPort });
