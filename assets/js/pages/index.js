import { home } from "../services/auth.js";
import { message } from "../utils/dom.js";
home().catch((e) => message(e.message));
