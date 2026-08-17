import { config } from "../config.js";
import { XmltvSource } from "./xmltv.js";

export class XmltvFreeSource extends XmltvSource {
  readonly id = "xmltvfree" as const;
  protected readonly url = config.xmltv.xmltvfree;
}
