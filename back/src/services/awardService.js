import { Award } from "../db"; // from을 폴더(db) 로 설정 시, 디폴트로 index.js 로부터 import함.
import { v4 as uuidv4 } from "uuid";

/** Static container class for services related to awards.
 *
 * @class
 * @method static async addAward({ title, description })
 * @method static async getAward({ id, title })
 * @method static async getAllAwards()
 * @method static async getUserAwards({ awardee_id })
 * @method static async searchAwards({ title, description })
 * @method static async setAward({ award_id, toUpdate })
 * @method static async removeAward({ award_id })
 */
class awardService {
    /** Add an award to the user.
     *
     * @static
     * @async
     * @param {Object} payload
     * @param {uuid} payload.awardee_id
     * @param {String} payload.title
     * @param {String} [payload.description]
     * @returns {award} added
     */
    static async addAward({ awardee_id, title, description }) {
        // Unlike user email, awards MAY have same name.

        const allowedFields = ["awardee_id", "title", "description"];
        const newAward = Object.fromEntries(
            Object.entries(arguments[0]).filter(([k, v]) =>
                allowedFields.includes(k)
            )
        );

        const id = uuidv4();
        newAward.id = id;

        console.log(`service.addAward >`, arguments);
        const added = await Award.create({ newAward });
        console.log(`service.addAward > added=${added}`);
        return added;
    }

    /** Find the first award that exactly matches id/title.
     *
     * @static
     * @async
     * @param {Object} payload
     * @param {uuid} [payload.award_id]
     * @param {String} [payload.title] - Must be an exact match.
     * @returns {award|null} found - If not found, just null.
     *  It will not emit error message.
     *
     * Both `id` and `title` are optional, but one of them must be provided.
     * Or we'll be oh so confused that we'll bail out.
     */
    static async getAward({ award_id, title }) {
        console.log(`service.getAward > `, arguments[0]);
        let found = null;
        if (award_id) {
            found = await Award.findById({ award_id });
        } else if (title) {
            found = await Award.findByName({ title });
        }

        return found;
    }

    /** Find every last award there is.
     *
     * @static
     * @async
     * @returns {award[]} found - If none, return an empty Array.
     *  It will not emit error message.
     */
    static async getAllAwards() {
        const found = await Award.findAll();
        return found;
    }

    /** Find all awards given to the user.
     *
     * @static
     * @async
     * @param {Object} payload
     * @param {uuid} payload.awardee_id
     * @returns {award[]} found - If none, return an empty Array.
     *  It will not emit error message.
     */
    static async getUserAwards({ awardee_id }) {
        console.log(`service.getUserAwards > `, arguments[0]);
        const found = await Award.searchByAwardee({ awardee_id });
        return found;
    }

    /** Search awards with title/desc keywords.
     *
     * @static
     * @async
     * @param {Object} payload
     * @param {String} [payload.title]
     * @param {String} [payload.description]
     * @returns {award[]} found, or an empty Array.
     *
     * @todo We're not implementing this until regex escaping can be done.
     */
    static async searchAwards({ title, description }) {
        return [];
    }

    /** Modify an award.
     *
     * @static
     * @async
     * @param {Object} payload
     * @param {uuid} payload.award_id
     * @param {Array[String[]]} payload.pairs - Array of [key, value] pairs.
     * @returns {award} updated
     *
     * payload.pairs is an iterable of [key, value] pairs.
     * The key will be the field and the value will be the... value!!
     */
    static async setAward({ award_id, pairs }) {
        console.log(`service.setAward > `, arguments[0]);

        const allowedFields = ["awardee_id", "title", "description"];
        const updated = await Award.update({
            award_id,
            pairs: pairs.filter(([k, v]) => {
                return allowedFields.includes(k);
            }),
        });

        return updated;
    }

    /** Remove an award.
     *
     * @static
     * @async
     * @param {Object} payload
     * @param {uuid} payload.award_id
     * @returns {award} removed
     */
    static async removeAward({ award_id }) {
        console.log(`service.removeAward > `, arguments[0]);
        const removed = await Award.delete({ award_id });
        console.log(`removed: `, removed);
        return removed;
    }
}

export { awardService };
