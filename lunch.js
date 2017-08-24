const Redis = require("ioredis");

const redis = new Redis();

// グループ個数取得を挟むとアトミックなコマンドではなくなるので固定長
const GROUP_COUNT_MAX = 10;

/** ランチのくくり */
class Lunch {
  static maxIdKey() { return "lunch_max_id"; }

  static nameKey() { return "lunch_names"; }

  /**
   * ランチくくり群のidとnameの組配列(idソート済み)
   * @return {Promise<{id: number, name: string}[]>}
   */
  static async idAndNames() {
    const lunchNames = await redis.hgetall(this.nameKey());
    return Object.keys(lunchNames || {}).sort().
      map((id) => ({id: Number(id), name: lunchNames[id]}));
  }

  /**
   * 新規ランチのくくり
   * @param {string} name
   */
  static async add(name) {
    let id;
    do { // idがかぶらなくなるまでmax_idをインクリメントして試行する
      id = await redis.incr(this.maxIdKey());
    } while(!Number(await redis.hsetnx(this.nameKey(), id, name)));
    return this.get(Number(id));
  }

  /**
   * ランチのくくり取得
   * @param {number} id
   */
  static get(id) {
    return new Lunch(id);
  }

  /**
   * @param {number} id
   */
  constructor(id) {
    /** @type {number} */
    this.id = id;
  }

  /**
   * 現在日付のグループ分け関連を取得
   * @param {string} date yyyy-mm-dd 
   */
  date(date) {
    return new LunchWithDate(this, date);
  }

  /**
   * ランチのくくり名
   * @return {Promise<string>}
   */
  async name() {
    return await redis.hget(this.constructor.nameKey(), this.id);
  }

  /**
   * ランチのくくり名セット
   * @param {string} name
   */
  async setName(name) {
    await redis.hset(this.constructor.nameKey(), this.id, name);
  }

  get currentDateKey() { return `lunch_current_date:${this.id}`; }

  /**
   * 現在のランチ予定日付
   * @return {Promise<string>}
   */
  async currentDate() {
    return await redis.get(this.currentDateKey);
  }

  get membersKey() { return `lunch_members:${this.id}`; }

  /**
   * ランチのくくりに属するメンバー名
   * @return {Promise<string[]>}
   */
  async members() {
    return await redis.lrange(this.membersKey, 0, -1);
  }

  /**
   * ランチのくくりに属するメンバー名セット
   * @param {string[]} names
   */
  async setMembers(names) {
    const membersKey = this.membersKey;
    const pipeline = redis.multi();
    pipeline.del(membersKey);
    for (const name of names) pipeline.rpush(membersKey, name);
    await pipeline.exec();
  }
  
  /**
   * メンバーから非アクティブを除いたものを返す
   * @param {string[]} inactiveMembers 
   */
  async membersWithout(inactiveMembers) {
    const members = await this.members();
    const inactiveMembersHash = {};
    for (const name of inactiveMembers) inactiveMembersHash[name] = true;
    return members.filter(name => !inactiveMembersHash[name]);
  }
  
  get groupCountKey() { return `lunch_group_count:${this.id}`; }

  /** 次回シャッフル用のグループ数デフォルト値 */
  async groupCount() {
    return Number(await redis.get(this.groupCountKey));
  }
}

/** ランチのくくりの現在日付のグループ分け関連 */
class LunchWithDate {
  /**
   * 
   * @param {Lunch} lunch 
   * @param {string} date yyyy-mm-dd
   */
  constructor(lunch, date) {
    /** @type {Lunch} */
    this.lunch = lunch;
    /** @type {string} */
    this.date = date;
  }

  get id() { return this.lunch.id; }

  get inactiveMembersKey() { return `lunch_inactive_members:${this.id}:${this.date}`; }

  /**
   * 非アクティブメンバーリスト
   * @return {string[]}
   */
  async inactiveMembers() {
    return await redis.smembers(this.inactiveMembersKey);
  }

  /**
   * グループgroupIdのメンバー名Redisキー
   * @param {number} groupId
   */
  groupMembersKey(groupId) { return `lunch_group_members:${this.id}:${this.date}:${groupId}`; }

  /**
   * シャッフルしたグループ分けを現在のグループ分けとしてセットする
   * @param {number} groupCount 作るグループ数
   * @param {string[]} inactiveMembers 除外するメンバー
   */
  async shuffleGroups(groupCount, inactiveMembers = []) {
    const membersOfGroups = await this.getShuffledMembersOfGroups(groupCount, inactiveMembers);

    const pipeline = redis.multi();
    // 現在日付をセット
    pipeline.set(this.lunch.currentDateKey, this.date);
    // 次回シャッフル用のグループ数デフォルト値を記録
    pipeline.set(this.lunch.groupCountKey, groupCount);
    // 非アクティブ状態を消去&追加
    const inactiveMembersKey = this.inactiveMembersKey;
    pipeline.del(inactiveMembersKey);
    for (const name of inactiveMembers) pipeline.sadd(inactiveMembersKey, name);
    // グループ分けを消去&追加
    for (let groupId = 0; groupId < GROUP_COUNT_MAX; ++groupId) {
      const groupMembersKey = this.groupMembersKey(groupId);
      pipeline.del(groupMembersKey);
      const membersOfGroup = membersOfGroups[groupId];
      for (const name of membersOfGroup) pipeline.sadd(groupMembersKey, name);
    }
    // 保存実行
    await pipeline.exec();
  }

  /**
   * グループ分けシャッフルのコア
   * @param {number} groupCount 
   * @param {string[]} inactiveMembers 
   */
  async getShuffledMembersOfGroups(groupCount, inactiveMembers = []) {
    const activeMembers = await this.lunch.membersWithout(inactiveMembers);
    // メンバーの配列をシャッフル (Fisher–Yates)
    for (let i = activeMembers.length - 1; i > 0; --i) {
      var r = Math.floor(Math.random() * (i + 1));
      var tmp = activeMembers[i];
      activeMembers[i] = activeMembers[r];
      activeMembers[r] = tmp;
    }
    // グループの枠を作る
    /** @type {string[][]} */
    const membersOfGroups = [];
    for (let i = 0; i < groupCount; ++i) membersOfGroups[i] = [];
    // メンバーを順番に当てはめていく
    let groupIdSource = 0;
    for (const name of activeMembers) {
      const groupId = groupIdSource % groupCount;
      membersOfGroups[groupId].push(name);
      ++groupIdSource;
    }
    return membersOfGroups;
  }

  /**
   * グループ分け
   * 全部空の場合は当該日付のものがない
   */
  async membersOfGroups() {
    const pipeline = redis.multi();
    for (let groupId = 0; groupId < GROUP_COUNT_MAX; ++groupId) {
      pipeline.smembers(this.groupMembersKey(groupId));
    }
    /** @type {Array<string[] | undefined>} */
    const membersOfGroups = await pipeline.exec();
    return membersOfGroups; // undefinedもあるのでとりあえず10件全部返す
  }

  /**
   * 現在のグループ分けにメンバーを追加する
   * @param {number} groupId
   * @param {string} name
   */
  async addGroupMember(groupId, name) {
    await redis.sadd(this.groupMembersKey(groupId), name);
  }

  /**
   * 現在のグループ分けでメンバーを移動する
   * @param {number} fromGroupId
   * @param {number} toGroupId
   * @param {string} name
   */
  async moveGroupMember(fromGroupId, toGroupId, name) {
    await redis.smove(this.groupMembersKey(fromGroupId), this.groupMembersKey(toGroupId), name);
  }

  /**
   * メンバーをアクティブにする
   * @param {string} name 
   */
  async setActive(name) {
    await redis.srem(this.inactiveMembersKey, name);
  }

  /**
   * メンバーを非アクティブにする
   * @param {string} name 
   */
  async setInactive(name) {
    await redis.sadd(this.inactiveMembersKey, name);
  }
}

module.exports = Lunch;
