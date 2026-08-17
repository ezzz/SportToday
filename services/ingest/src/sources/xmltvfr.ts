import { config } from "../config.js";
import { XmltvSource } from "./xmltv.js";

export class XmltvFrSource extends XmltvSource {
  readonly id = "xmltvfr" as const;
  protected readonly url = config.xmltv.xmltvfr;
}
