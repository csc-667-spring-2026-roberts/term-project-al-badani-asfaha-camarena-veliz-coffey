import { Router } from "express";

const router = Router();

router.get("/lobby", (_, response) => {
  // extract user email from session and put it here
  response.render("lobby", { email: "test@example.com" });
});

router.get("/register", (_, response) => {
  response.render("register");
});

// Replace with register logic
router.post("/register", (_, response) => {
  response.redirect("/lobby");
});

router.get("/login", (_, response) => {
  response.render("login");
});

// Replace with login logic
router.post("/login", (_, response) => {
  response.redirect("/lobby");
});

// Replace with delete session logic
router.get("/logout", (_, response) => {
  response.redirect("login");
});

export default router;
