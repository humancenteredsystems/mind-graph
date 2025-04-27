## 🚀 Purpose

Push a local `schema.graphql` to the deployed Dgraph Alpha instance inside Render.

---

# 🛠️ Step-by-Step (Fast Path)

### 1. Find correct service URL inside Render (if needed)

- Open **mims-graph-docker-api** (Node.js API service)
  - URL: `https://mims-graph-docker-api.onrender.com`
- Open **mims-graph-dgraph** (Dgraph service)
  - Go to 'Shell'
  - Ctrl+F for 'SSH address' - it's near the top, above the shell terminal.
  - Use this to push schema via SCP, then SSH into the Dgraph machine

✅ Remember: Dgraph Alpha is *reachable at* `localhost:8080` **from inside the server**, **not directly from outside**.

---

### 2. Upload `schema.graphql` to the server

**From your laptop** (NOT inside SSH):

```bash
scp /home/gb/coding/mims-graph/schema.graphql srv-d02m8v3uibrs73b1kan0@ssh.virginia.render.com:~/schema.graphql
```

✅ This copies `schema.graphql` into the server’s home directory.

---

### 3. SSH into the server

```bash
ssh srv-d02m8v3uibrs73b1kan0@ssh.virginia.render.com
```

✅ You’ll land inside a root shell.

---

### 4. Confirm the schema file is there

Inside SSH session:

```bash
ls -l schema.graphql
```

✅ Should show the file.

---

### 5. Push the schema to Dgraph Alpha

Inside SSH session:

```bash
curl -X POST http://localhost:8080/admin/schema \
  -H "Content-Type: application/graphql" \
  --data-binary @schema.graphql
```

✅ Should return:

```json
{"data":{"code":"Success","message":"Done"}}
```

---

### 6. Verify schema updated (Edge fields)

Inside SSH session:

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __type(name: \"Edge\") { fields { name } } }"}'
```

✅ Should list fields like `from`, `fromId`, `to`, `toId`, `type`.

---

# 📋 Quick Troubleshooting

| Problem | Fix |
|:--------|:----|
| `scp` fails | Make sure you're running it from your laptop, not inside SSH |
| `Cannot POST /admin/schema` | Make sure you're posting inside SSH to `localhost:8080` |
| `nano/vi: command not found` | Always upload the file, don't try to edit inside the server |

---
# To delete all edges and nodes remotely

Execute this from the SSH session:
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d '{"query":"mutation { deleteEdge(filter: {}) { msg numUids } deleteNode(filter: {}) { msg numUids } }"}'

---

# 🧠 Notes
- Only push **inside** the server (private network access to Dgraph).
- Use `scp` to upload files — don't try to edit (`nano`, `vi` missing).
- `/admin/schema` only accepts `POST`, not `GET`.
- If Render URLs change, find them in the Render dashboard.

---

# ✅ Done.
