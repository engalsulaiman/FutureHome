import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "procurement.db");

const globalForDb = globalThis as unknown as { __procurementDb?: DatabaseSync };

function seedIfEmpty(db: DatabaseSync) {
  const { count } = db.prepare("SELECT COUNT(*) as count FROM requests").get() as {
    count: number;
  };
  if (count > 0) return;

  const now = new Date();
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  const seedRows = [
    {
      title: "Laptop refresh - Finance team",
      project: "Q3 Hardware Refresh",
      department: "Finance",
      requestedBy: "Sara Ahmed",
      vendor: "Dell",
      description: "Replace 15 aging laptops for the Finance team.",
      status: "PO_ISSUED",
      prNumber: "PR-1042",
      prDate: daysAgo(20),
      poNumber: "PO-3301",
      poDate: daysAgo(8),
      poAmount: 18500,
      currency: "USD",
      invoiceNumber: null,
      invoiceDate: null,
      invoiceAmount: null,
      notes: "Awaiting delivery before invoicing.",
      createdAt: daysAgo(25),
      updatedAt: daysAgo(8),
    },
    {
      title: "Firewall renewal",
      project: "Network Security",
      department: "IT",
      requestedBy: "Omar Khalil",
      vendor: "Palo Alto Networks",
      description: "Annual license renewal for perimeter firewalls.",
      status: "INVOICED",
      prNumber: "PR-1038",
      prDate: daysAgo(40),
      poNumber: "PO-3287",
      poDate: daysAgo(30),
      poAmount: 9200,
      currency: "USD",
      invoiceNumber: "INV-7765",
      invoiceDate: daysAgo(5),
      invoiceAmount: 9200,
      notes: null,
      createdAt: daysAgo(45),
      updatedAt: daysAgo(5),
    },
    {
      title: "New ERP module - Procurement",
      project: "ERP Expansion",
      department: "Operations",
      requestedBy: "Lina Haddad",
      vendor: "SAP",
      description: "Add procurement module licenses to existing ERP contract.",
      status: "SCOPE_REVIEW",
      prNumber: null,
      prDate: null,
      poNumber: null,
      poDate: null,
      poAmount: null,
      currency: "USD",
      invoiceNumber: null,
      invoiceDate: null,
      invoiceAmount: null,
      notes: "Waiting on vendor quote before scoping.",
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      title: "Office Wi-Fi access points",
      project: "Office Connectivity Upgrade",
      department: "IT",
      requestedBy: "Omar Khalil",
      vendor: "Ubiquiti",
      description: "12 new access points for the 3rd floor expansion.",
      status: "PR_APPROVED",
      prNumber: "PR-1051",
      prDate: daysAgo(6),
      poNumber: null,
      poDate: null,
      poAmount: 4300,
      currency: "USD",
      invoiceNumber: null,
      invoiceDate: null,
      invoiceAmount: null,
      notes: null,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(2),
    },
    {
      title: "HR system support contract",
      project: "HRIS Maintenance",
      department: "HR",
      requestedBy: "Mona Yousef",
      vendor: "Workday",
      description: "Renew yearly support and maintenance contract.",
      status: "CLOSED",
      prNumber: "PR-0991",
      prDate: daysAgo(90),
      poNumber: "PO-3190",
      poDate: daysAgo(80),
      poAmount: 12000,
      currency: "USD",
      invoiceNumber: "INV-7610",
      invoiceDate: daysAgo(70),
      invoiceAmount: 12000,
      notes: "Fully closed and paid.",
      createdAt: daysAgo(95),
      updatedAt: daysAgo(70),
    },
    {
      title: "Backup storage expansion",
      project: "Data Center Capacity",
      department: "IT",
      requestedBy: "Omar Khalil",
      vendor: "NetApp",
      description: "Additional 40TB of backup storage capacity.",
      status: "PR_CREATED",
      prNumber: "PR-1055",
      prDate: daysAgo(18),
      poNumber: null,
      poDate: null,
      poAmount: 15800,
      currency: "USD",
      invoiceNumber: null,
      invoiceDate: null,
      invoiceAmount: null,
      notes: "Vendor has not responded in over two weeks.",
      createdAt: daysAgo(18),
      updatedAt: daysAgo(18),
    },
  ];

  const insert = db.prepare(
    `INSERT INTO requests (
      id, title, project, department, requestedBy, vendor, description, status,
      prNumber, prDate, poNumber, poDate, poAmount, currency,
      invoiceNumber, invoiceDate, invoiceAmount, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const row of seedRows) {
    insert.run(
      randomUUID(),
      row.title,
      row.project,
      row.department,
      row.requestedBy,
      row.vendor,
      row.description,
      row.status,
      row.prNumber,
      row.prDate,
      row.poNumber,
      row.poDate,
      row.poAmount,
      row.currency,
      row.invoiceNumber,
      row.invoiceDate,
      row.invoiceAmount,
      row.notes,
      row.createdAt,
      row.updatedAt
    );
  }
}

function createConnection(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      project TEXT NOT NULL,
      department TEXT NOT NULL,
      requestedBy TEXT NOT NULL,
      vendor TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'SCOPE_REVIEW',
      prNumber TEXT,
      prDate TEXT,
      poNumber TEXT,
      poDate TEXT,
      poAmount REAL,
      currency TEXT NOT NULL DEFAULT 'USD',
      invoiceNumber TEXT,
      invoiceDate TEXT,
      invoiceAmount REAL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);
  seedIfEmpty(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__procurementDb) {
    globalForDb.__procurementDb = createConnection();
  }
  return globalForDb.__procurementDb;
}
