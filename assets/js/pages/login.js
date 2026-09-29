import { signIn, home } from "../services/auth.js";
import { bindForm } from "../utils/dom.js";
bindForm("login-form", async (p) => {
  await signIn(p.email, p.password);
  await home();
});
