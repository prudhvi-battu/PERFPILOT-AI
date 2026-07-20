const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'ecommerce.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let _db = null;
let _initPromise = null;

class Statement {
  constructor(db, sql) {
    this._db = db;
    this._sql = sql;
  }
  get(...params) {
    const stmt = this._db.prepare(this._sql);
    const bp = params.map(p => p === undefined ? null : p);
    if (bp.length > 0) stmt.bind(bp);
    if (stmt.step()) { const row = stmt.getAsObject(); stmt.free(); return row; }
    stmt.free(); return undefined;
  }
  all(...params) {
    const stmt = this._db.prepare(this._sql);
    const bp = params.map(p => p === undefined ? null : p);
    if (bp.length > 0) stmt.bind(bp);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
  run(...params) {
    const bp = params.map(p => p === undefined ? null : p);
    this._db.run(this._sql, bp);
    const r = this._db.exec('SELECT last_insert_rowid() as id, changes() as changes');
    return { lastInsertRowid: r[0].values[0][0], changes: r[0].values[0][1] };
  }
}

class Database {
  constructor(sqlDb) { this._db = sqlDb; }
  prepare(sql) { return new Statement(this._db, sql); }
  exec(sql) { this._db.run(sql); }
  transaction(fn) {
    return (...args) => {
      this.exec('BEGIN');
      try { const r = fn(...args); this.exec('COMMIT'); return r; }
      catch (e) { try { this.exec('ROLLBACK'); } catch (_) {} throw e; }
    };
  }
  persist() {
    try {
      const data = this._db.export();
      const tmp = DB_PATH + '.tmp';
      fs.writeFileSync(tmp, Buffer.from(data));
      fs.renameSync(tmp, DB_PATH);
    } catch (e) { console.error('Persist error:', e.message); }
  }
  close() { this.persist(); this._db.close(); }
}

async function initDb() {
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    let sqlDb = (fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 0)
      ? new SQL.Database(fs.readFileSync(DB_PATH))
      : new SQL.Database();
    sqlDb.run('PRAGMA journal_mode=WAL');
    sqlDb.run('PRAGMA foreign_keys=ON');
    _db = new Database(sqlDb);

    setInterval(() => _db?.persist(), 10000);
    const shutdown = () => { _db?.close(); _db = null; };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('exit', shutdown);
    return _db;
  })();

  return _initPromise;
}

function getDb() {
  if (!_db) throw new Error('Database not initialized. Call await initDb() first.');
  return _db;
}

module.exports = { initDb, getDb };
