# MongoDB Shell (mongosh) Cheatsheet for TaskQuest

## 1. Connect to MongoDB

```
mongosh
```
Or, with a connection string:
```
mongosh "mongodb://127.0.0.1:27017/taskquest"
```

## 2. Switch to Your Database

```
use taskquest
```

## 3. List All Collections

```
show collections
```

## 4. Query Collections

- **Find all users:**
  ```
  db.users.find().pretty()
  ```
- **Find all tasks:**
  ```
  db.tasks.find().pretty()
  ```
- **Find all quests:**
  ```
  db.quests.find().pretty()
  ```
- **Find a user by email:**
  ```
  db.users.findOne({ email: "user@example.com" })
  ```

## 5. Count Documents

```
db.users.countDocuments()
db.tasks.countDocuments()
db.quests.countDocuments()
```

## 6. Delete Documents

- **Delete all users:**
  ```
  db.users.deleteMany({})
  ```
- **Delete all tasks:**
  ```
  db.tasks.deleteMany({})
  ```
- **Delete all quests:**
  ```
  db.quests.deleteMany({})
  ```

## 7. Update Documents

- **Remove empty phone fields from all users:**
  ```
  db.users.updateMany({ phone: "" }, { $unset: { phone: "" } })
  ```
- **Set a user's role to ADMIN:**
  ```
  db.users.updateOne({ email: "user@example.com" }, { $set: { role: "ADMIN" } })
  ```

## 8. Drop Indexes (if needed for schema changes)

- **Drop unique index on phone:**
  ```
  db.users.dropIndex("phone_1")
  ```
- **Drop unique index on firebaseUid:**
  ```
  db.users.dropIndex("firebaseUid_1")
  ```

## 9. Miscellaneous

- **Show database stats:**
  ```
  db.stats()
  ```
- **Show indexes for users collection:**
  ```
  db.users.getIndexes()
  ```

---

**Tip:**
- Use `pretty()` to format output for easier reading.
- Use `ObjectId("<id>")` to query by MongoDB document ID.

---

*This cheatsheet is tailored for the TaskQuest project. Save or download for quick reference!* 