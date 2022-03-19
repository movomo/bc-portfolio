import { v4 as uuidv4 } from "uuid";
import { BaseModel } from "../db";

/**
 * @typedef {string} field
 * @typedef {Object.<string, any>} record
 * @typedef {Object.<string, string>} populator
 * @typedef {[string, any]} kvpair
 * @typedef {string} uuid
 */

/** Base class for Services. Mainly verifies the data fields passing through.
 *
 * @prop {BaseModel} Model
 * @prop {string} name
 * @prop {field[]} requiredFields - Required field names.
 * @prop {field[]} optionalFields - Optional field names.
 * @prop {field[]} uniqueFields -
 *      Field names that should not happen twice in the db.
 * @prop {field[]} searchableFields -
 *      Field names that are searchable with substring.
 * @prop {populator} refFields -
 *      Indicates that KEY fields need to be populated with VALUEs.
 * @prop {field[]} allFields -
 *      All existing fields, only these are allowed in.
 *
 * @method static async add(record) {} - Add a record to the user.
 * @method static async get({ id }) {}
 *  - Find the first record that exactly matches the id.
 * @method static async getAll(query) {}
 *  - Find every last record there is (that matches the optional query).
 * @method static async getUserOwned({ user_id })
 *  - Find all records that belong to the user.
 * @method static async set(record) {}
 * @method static async del({ id }) {}
 */
class BaseService {
    static Model = BaseModel;

    static name = "base";
    // #_user_id_amend silently amends the mistake in Award, Project schemas
    // whose owner field names are set to some overcomplicated names instead of
    // just 'user_id'.
    static #_user_id_amend = null;

    static requiredFields = Object.freeze([]);
    static optionalFields = Object.freeze([]);
    static uniqueFields = Object.freeze([]);
    static searchableFields = Object.freeze([]);

    static refFields = Object.freeze({});

    static allFields = Object.freeze([
        ...this.requiredFields,
        ...this.optionalFields,
    ]);

    /** Add a record to the user.
     *
     * @static
     * @async
     * @param {record} record
     * @returns {record} added
     */
    static async add(record) {
        console.log(`${this.name}.add >`, arguments[0]);

        // Squash unnecessary fields first.
        const data = Object.fromEntries(
            Object.entries(record).filter(([k, v]) => {
                return this.allFields.includes(k);
            })
        );

        // Then see if it has all we need.
        // These fields are required.
        this.requiredFields.forEach((k) => {
            if (!(k in data)) {
                throw new Error(
                    `${k} field is required for ${this.name} record`
                );
            }
        });

        // So far, so good.
        data.id = uuidv4();

        const added = await this.Model.create(data);
        console.log(`${this.name}.add > added=`, added);

        return added;
    }

    /** Find the first record that exactly matches the id.
     *
     * @static
     * @async
     * @param {{id: uuid}} payload
     * @returns {record|null} found - If not found, just null.
     *      It will not emit error message.
     */
    static async get({ id }) {
        console.log(`${this.name}Service.get > `, arguments[0]);

        // Confirmed, null query is ok.
        // Probably because we don't have any null in the db.
        // Yet.
        // Hmm
        // if (!id) {
        //     throw new Error(`Bad query: ${arguments[0]}`)
        // }

        const found = await this.Model.find({ id });

        return found;
    }

    /** Find every last record there is (that matches the optional query).
     *
     * @static
     * @async
     * @param {record} [query]
     * @returns {record[]} found - If none, return an empty Array.
     *      It will not emit error message.
     */
    static async getAll(query) {
        // It's ok to omit query!
        if (!query) {
            query = {};
        }
        const found = await this.Model.findAll(query);
        return found;
    }

    /** Find all records that belong to the user.
     *
     * @static
     * @async
     * @param {{user_id: uuid}} payload
     * @returns {project[]} found - If none, return an empty Array.
     *  It will not emit error message.
     */
    static async getUserOwned({ user_id }) {
        console.log(`${this.name}Service.getUserOwned > `, arguments[0]);

        const query = {};
        if (this.#_user_id_amend) {
            // Passing this test means that at some point of the past I
            // fucked up hard and now facing the consequences.
            query[this.#_user_id_amend] = user_id;
        } else {
            query.user_id = user_id;
        }

        const found = await this.Model.findAll(query);

        return found;
    }

    static async set(record) {}
    static async del({ id }) {}
}

export { BaseService };
