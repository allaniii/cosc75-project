import { db } from "../config/supabase.js";
import { recover, updatePassword, signOut } from "../services/auth.js";
import { $, bindForm, message } from "../utils/dom.js";
try {
  db().auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      $("#password-form").hidden = false;
      $("#recovery-form").hidden = true;
    }
  });
  db()
    .auth.getSession()
    .then(({ data }) => {
      if (data.session) {
        $("#password-form").hidden = false;
        $("#recovery-form").hidden = true;
      }
    });
} catch (e) {
  message(e.message);
}
bindForm("recovery-form", async (p) => {
  await recover(p.email);
  setTimeout(
    () =>
      message(
        "If the account exists, a recovery link has been sent. Check your email.",
        "success",
      ),
    0,
  );
});
bindForm("password-form", async (p) => {
  if (p.password !== p.confirm) throw new Error("Passwords do not match.");
  await updatePassword(p.password);
  await signOut();
});
