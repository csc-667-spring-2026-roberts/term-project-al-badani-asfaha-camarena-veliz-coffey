import { Router } from "express";
import crypto from "crypto";
import Users from "../db/users.js";
import bcrypt from "bcrypt";
import { TypedRequestBody, UserLoginRequestBody, User } from "../types/types.js";

const router = Router();

const SALT_ROUNDS = 10;

function gravatarUrl(email: string): string {
  const hash = crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex");

  return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
}

router.post("/register", async (request: TypedRequestBody<UserLoginRequestBody>, response) => {
  const { email, password } = request.body;

  if (!email || !password) {
    // response.status(400).json({ error: "Email and password are required" });
    response.status(400).render("register", { errorMessage: "Email and password are required" });
    return;
  }

  if (password.length < 8) {
    // response.status(400).json({ error: "Password must be at least 8 characters long" });
    response
      .status(400)
      .render("register", { errorMessage: "Password must be at least 8 characters long" });
    return;
  }

  try {
    if (await Users.existing(email)) {
      // response.status(409).json({ error: "Email is already registered" });
      response.status(409).render("register", { errorMessage: "Email is already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const avatar = gravatarUrl(email);

    const user = await Users.create(email, passwordHash, avatar);

    request.session.user = user;

    // response.status(201).json({
    //   ...user,
    // });
    response.redirect("/lobby");
  } catch (error) {
    console.error("Registration error:", error);
    // response.status(500).json({ error: "Internal server error" });
    response.status(409).render("register", { errorMessage: "Internal server error" });
  }
});

router.get("/lobby", (request, response) => {
  const user: User | undefined = request.session.user;
  if (user === undefined) {
    response.redirect("/login");
    return;
  }
  // extract user email from session and put it here
  response.render("lobby", { email: user.email, avatar: user.gravatar_url });
});

router.get("/register", (_, response) => {
  response.render("register");
});

router.post("/login", async (request: TypedRequestBody<UserLoginRequestBody>, response) => {
  const { email, password } = request.body;

  if (!email || !password) {
    // response.status(400).json({ error: "Email and password are required" });
    response.status(500).render("login", { errorMessage: "Email and password are required" });
    return;
  }

  try {
    const dbUser = await Users.findByEmail(email);
    const isMatch = await bcrypt.compare(password, dbUser.password_hash);

    if (!isMatch) {
      throw new Error(`Match not found for ${email}`);
    }

    const user = {
      id: dbUser.id,
      email: dbUser.email,
      gravatar_url: dbUser.gravatar_url,
      created_at: dbUser.created_at,
    };

    request.session.user = user;

    // response.json(user);
    response.redirect("/lobby");
  } catch (error) {
    console.error("Login error:", error);
    // response.status(500).json({ error: "Invalid email or password" });
    response.status(500).render("login", { errorMessage: "Invalid email or password" });
  }
});

router.get("/login", (_, response) => {
  response.render("login");
});

router.get("/logout", (request, response) => {
  request.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error);
      response.status(500).json({ error: "Logout failed" });
      return;
    }

    response.clearCookie("connect.sid");
    // response.json({ message: "Logged out successfully" });
    response.redirect("/login");
  });
});

export default router;
