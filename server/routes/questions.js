// Questions about a specific project. Auth required; project must belong to the user.
// Persisted to the `questions` collection (acts as the inbox). Wire email/SMTP later if needed.
const express = require("express");
const { ObjectId } = require("mongodb");
const { col } = require("../db");
const { trim } = require("../lib/validate");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const oid = (id) => { try { return new ObjectId(id); } catch { return null; } };
const publicQ = (q) => ({ id: String(q._id), message: q.message, createdAt: q.createdAt, status: q.status || "open" });

async function ownedProject(req) {
  const id = oid(req.params.projectId);
  if (!id) return null;
  return col("projects").findOne({ _id: id, userId: new ObjectId(req.userId) });
}

router.post("/", async (req, res, next) => {
  try {
    const project = await ownedProject(req);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const message = trim(req.body && req.body.message);
    if (message.length < 5) return res.status(400).json({ error: "Please enter your question (at least 5 characters)" });
    if (message.length > 4000) return res.status(400).json({ error: "Question is too long (max 4000 characters)" });

    const doc = {
      projectId: project._id,
      userId: new ObjectId(req.userId),
      projectName: project.name,
      message: message.slice(0, 4000),
      status: "open",
      createdAt: new Date(),
    };
    const r = await col("questions").insertOne(doc);
    res.status(201).json({ question: publicQ({ ...doc, _id: r.insertedId }) });
  } catch (e) { next(e); }
});

router.get("/", async (req, res, next) => {
  try {
    const project = await ownedProject(req);
    if (!project) return res.status(404).json({ error: "Project not found" });
    const qs = await col("questions").find({ projectId: project._id }).toArray();
    qs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ questions: qs.map(publicQ) });
  } catch (e) { next(e); }
});

module.exports = router;
