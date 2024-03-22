import mysql from "mysql2/promise";
import { Authorize } from "../middleware/Authorize.js";
import BankServices from "../services/Bank.services.js";
import WebsiteServices from "../services/WebSite.Service.js";
import connectToDB from "../db/db.js";

const EditAPIRoute = (app) => {
  //   API To Edit Bank Detail
  app.put(
    "/api/bank-edit/:bank_id",
    Authorize(["superAdmin", "Bank-View", "Transaction-View"]),
    async (req, res) => {
      const pool = await connectToDB();
      try {
        const bankId = req.params.bank_id;
        const [id] = await pool.execute(
          `SELECT * FROM Bank WHERE (bank_id) = (?)`,
          [bankId]
        );
        console.log("update", id);
        const updateResult = await BankServices.updateBank(id[0], req.body);
        console.log("update", updateResult);
        if (updateResult) {
          res
            .status(201)
            .send(
              "Bank Detail's edit request sent to Super Admin for Approval"
            );
        }
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    }
  );

  //   API For Bank Detail Edit Approval
  app.post(
    "/api/admin/approve-bank-detail-edit-request/:requestId",
    Authorize(["superAdmin", "RequestAdmin"]),
    async (req, res) => {
      const pool = await connectToDB();
      try {
        const [editRequest] = await pool.execute(
          `SELECT * FROM EditBankRequest WHERE bank_id = ?`,
          [req.params.requestId]
        );

        if (!editRequest || editRequest.length === 0) {
          return res.status(404).send({ message: "Edit request not found" });
        }

        const { isApproved } = req.body;
        if (typeof isApproved !== "boolean") {
          return res
            .status(400)
            .send({ message: "isApproved field must be a boolean value" });
        }

        if (!editRequest[0].isApproved) {
          if (isApproved) {
            const [bankExists] = await pool.execute(
              `SELECT * FROM Bank WHERE bankName = ? AND bank_id != ?`,
              [editRequest[0].bankName, req.params.requestId]
            );

            if (bankExists && bankExists.length > 0) {
              return res
                .status(400)
                .send({ message: "Bank with the same name already exists" });
            }
            await pool.execute(
              `UPDATE Bank SET accountHolderName = ?, bankName = ?, accountNumber = ?, ifscCode = ?, upiId = ?, upiAppName = ?,
            upiNumber = ? WHERE bank_id = ?`,
              [
                editRequest[0].accountHolderName,
                editRequest[0].bankName,
                editRequest[0].accountNumber,
                editRequest[0].ifscCode,
                editRequest[0].upiId,
                editRequest[0].upiAppName,
                editRequest[0].upiNumber,
                req.params.requestId,
              ]
            );

            await pool.execute(
              `UPDATE EditBankRequest SET isApproved = TRUE WHERE bank_id = ?`,
              [req.params.requestId]
            );

            await pool.execute(
              `DELETE FROM EditBankRequest WHERE bank_id = ?`,
              [req.params.requestId]
            );

            return res
              .status(200)
              .send({ message: "Edit request approved and data updated" });
          } else {
            return res.status(200).send({ message: "Edit request rejected" });
          }
        } else {
          return res
            .status(200)
            .send({ message: "Edit request is already approved" });
        }
      } catch (e) {
        console.error(e);
        res.status(500).send({ message: "Internal server error" });
      }
    }
  );

  // API To Edit Website Detail
  app.put(
    "/api/website-edit/:website_id",
    Authorize(["superAdmin", "Transaction-View", "Website-View"]),
    async (req, res) => {
      const pool = await connectToDB();
      try {
        const id = req.params.website_id;
        const [editWebsite] = await pool.execute(
          `SELECT * FROM Website WHERE (website_id) = (?)`,
          [id]
        );
        if (!editWebsite) {
          throw { code: 404, message: "Website not found for Editing" };
        }
        const updateResult = await WebsiteServices.updateWebsite(
          editWebsite[0],
          req.body
        );
        console.log(updateResult);
        if (updateResult) {
          res
            .status(201)
            .send("Website Detail's Sent to Super Admin For Approval");
        }
      } catch (e) {
        console.error(e);
        res.status(e.code).send({ message: e.message });
      }
    }
  );

  //   API For Website Detail Edit Approval
  app.post(
    "/api/admin/approve-website-detail-edit-request/:requestId",
    Authorize(["superAdmin", "RequestAdmin"]),
    async (req, res) => {
      const pool = await connectToDB();
      try {
        const [editRequest] = await pool.execute(
          `SELECT * FROM EditWebsiteRequest WHERE website_id = ?`,
          [req.params.requestId]
        );

        if (!editRequest || editRequest.length === 0) {
          return res.status(404).send({ message: "Edit request not found" });
        }

        const { isApproved } = req.body;

        if (typeof isApproved !== "boolean") {
          return res
            .status(400)
            .send({ message: "isApproved field must be a boolean value" });
        }

        if (!editRequest[0].isApproved) {
          if (isApproved) {
            const [websiteExists] = await pool.execute(
              `SELECT * FROM Website WHERE websiteName = ? AND website_id != ?`,
              [editRequest[0].websiteName, req.params.requestId]
            );

            console.log("websiteExists", websiteExists);

            if (websiteExists && websiteExists.length > 0) {
              return res
                .status(400)
                .send({ message: "Website with the same name already exists" });
            }

            await pool.execute(
              `UPDATE Website SET websiteName = ? WHERE website_id = ?`,
              [editRequest[0].websiteName, req.params.requestId]
            );

            await pool.execute(
              `UPDATE EditWebsiteRequest SET isApproved = TRUE WHERE website_id = ?`,
              [req.params.requestId]
            );

            await pool.execute(
              `DELETE FROM EditWebsiteRequest WHERE website_id = ?`,
              [req.params.requestId]
            );

            return res
              .status(200)
              .send({ message: "Edit request approved and data updated" });
          } else {
            await pool.execute(
              `DELETE FROM EditWebsiteRequest WHERE website_id = ?`,
              [req.params.requestId]
            );
            return res.status(200).send({ message: "Edit request rejected" });
          }
        } else {
          return res
            .status(400)
            .send({ message: "Edit request has already been processed" });
        }
      } catch (e) {
        console.error(e);
        res
          .status(e.code || 500)
          .send({ message: e.message || "Internal server error" });
      }
    }
  );
};

export default EditAPIRoute;
