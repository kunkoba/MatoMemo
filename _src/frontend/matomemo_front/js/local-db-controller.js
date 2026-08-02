// 現在のログインユーザーIDを取得（未ログイン時は 'anonymous'）
const getUserId = () => {
    const uid = $App.AppData.Owner.SystemInfo?.login_user_id;
    // IDが空（未ログインまたは初期化前）ならエラーを投げて後続のDB処理を止める
    if (!uid) {
        throw new Error("[LocalDB] ユーザーIDが取得できていません！");
    }
    return uid;
};

// IndexedDBの低レイヤー操作を担当する現場作業員（Core）
const _LocalDbCore = {
    db: null,
    DB_NAME: "littleTripMemoDb",
    VERSION: 5,
    // トランザクションモード定義
    TRANSACTION_MODES: {
        READONLY: 'readonly',
        READWRITE: 'readwrite',
    },
    // ストア名称定義
    STORE_NAMES: {
        DETAIL: 'detailStore',
        REACTION: 'reactionStore',
        NOTICE: 'noticeStore',
        MAIL: 'mailStore',
        LEGAL: 'legalStore',
    },
    // 初期化
    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.VERSION);
            // 構造変更時のテーブル作成
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this._createStores(db, event.oldVersion);
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("- IndexedDB: 準備完了");
                resolve(this.db);
            };
            request.onerror = (event) => {
                console.error("IndexedDB Core: 初期化エラー", event.target.error);
                reject(event.target.error);
            };
        });
    },
    // ※※※※ データベースを削除する関数 ※※※※
    __deleteAllDatabases() {
        console.log("◆__deleteAllDatabases");
        const request = indexedDB.deleteDatabase(this.DB_NAME);
        request.onsuccess = () => {
            console.log(`deleteAllDatabases >> データベース ${this.DB_NAME} は削除されました`);
        };
        request.onerror = (event) => {
            console.error("deleteAllDatabases >> データベース削除エラー:", event.target.error);
        };
        request.onblocked = () => {
            console.warn("deleteAllDatabases >> データベース削除がブロックされました　全てのブラウザを閉じて再試行してください");
        };
    },
    // 各ストア（テーブル）の作成とインデックス設定
    _createStores(db, oldVersion) {
        // バージョン3未満の古いストアが存在すれば削除してスキーマを更新する
        if (oldVersion < 3) {
            if (db.objectStoreNames.contains(this.STORE_NAMES.DETAIL)) db.deleteObjectStore(this.STORE_NAMES.DETAIL);
            if (db.objectStoreNames.contains(this.STORE_NAMES.REACTION)) db.deleteObjectStore(this.STORE_NAMES.REACTION);
            if (db.objectStoreNames.contains(this.STORE_NAMES.NOTICE)) db.deleteObjectStore(this.STORE_NAMES.NOTICE);
            if (db.objectStoreNames.contains(this.STORE_NAMES.MAIL)) db.deleteObjectStore(this.STORE_NAMES.MAIL);
        }
        // 詳細データ（主キーはdbidだが、データ内に user_id を持つ）
        if (!db.objectStoreNames.contains(this.STORE_NAMES.DETAIL)) {
            db.createObjectStore(this.STORE_NAMES.DETAIL, { keyPath: "dbid", autoIncrement: true });
        }
        // リアクション（ユーザーごとの分離のため user_id も複合キーに含める）
        if (!db.objectStoreNames.contains(this.STORE_NAMES.REACTION)) {
            db.createObjectStore(this.STORE_NAMES.REACTION, { keyPath: ["user_id", "archive_id", "seq"] });
        }
        // 通知既読履歴（ユーザーごとに既読を管理）
        if (!db.objectStoreNames.contains(this.STORE_NAMES.NOTICE)) {
            db.createObjectStore(this.STORE_NAMES.NOTICE, { keyPath: ["user_id", "seq"] });
        }
        // ユーザあて通知（ユーザーごとに既読を管理）
        if (!db.objectStoreNames.contains(this.STORE_NAMES.MAIL)) {
            db.createObjectStore(this.STORE_NAMES.MAIL, { keyPath: ["user_id", "seq"] });
        }
        // 規約・ポリシー等（LEGAL）用
        if (!db.objectStoreNames.contains(this.STORE_NAMES.LEGAL)) {
            // id（'TermsOfService', 'PrivacyPolicy' 等のキー名）を主キーにする
            db.createObjectStore(this.STORE_NAMES.LEGAL, { keyPath: "id" });
        }
    },
    // トランザクションからオブジェクトストアを取得
    _getStore(storeName, mode = this.TRANSACTION_MODES.READONLY) {
        if (!this.db) throw new Error("データベースが初期化されていません");
        const transaction = this.db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    },
    // 追加更新（新規登録時は「dbid」を採番）
    async upsertData(storeName, data) {
        return new Promise((resolve) => {
            try {
                const store = this._getStore(storeName, this.TRANSACTION_MODES.READWRITE);
                const request = store.put(data);
                request.onsuccess = (event) => {
                    // 採番されたIDをデータ本体のdbidに書き戻す（参照渡しを利用）
                    data.dbid = event.target.result;
                    resolve(true);
                };
                request.onerror = (e) => {
                    console.error("Core Upsert Error:", e.target.error);
                    resolve(false);
                };
            } catch (err) {
                console.error("Core Transaction Error:", err);
                resolve(false);
            }
        });
    },
    // _LocalDbCore 内に追加（全件更新用ヘルパー）
    async updateAll(storeName, updateFn) {
        return new Promise((resolve, reject) => {
            const store = this._getStore(storeName, this.TRANSACTION_MODES.READWRITE);
            const request = store.openCursor();
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    const newValue = updateFn(cursor.value);
                    cursor.update(newValue);
                    cursor.continue();
                } else {
                    resolve(true);
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },
    // キーによる取得
    async getDataByKey(storeName, key) {
        return new Promise((resolve, reject) => {
            const store = this._getStore(storeName, this.TRANSACTION_MODES.READONLY);
            const request = store.get(key);
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },
    // 全件取得
    async getAllData(storeName) {
        return new Promise((resolve, reject) => {
            const store = this._getStore(storeName, this.TRANSACTION_MODES.READONLY);
            const request = store.getAll();
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },
    // 条件に合致するデータを削除
    async deleteByFilter(storeName, filterFn) {
        return new Promise((resolve, reject) => {
            const store = this._getStore(storeName, this.TRANSACTION_MODES.READWRITE);
            const request = store.openCursor();
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    if (filterFn(cursor.value)) cursor.delete();
                    cursor.continue();
                } else {
                    resolve(true);
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },
    // 全件削除
    async deleteAllData(storeName) {
        return new Promise((resolve, reject) => {
            try {
                const store = this._getStore(storeName, this.TRANSACTION_MODES.READWRITE);
                const request = store.clear();
                request.onsuccess = () => {
                    resolve(true);
                };
                request.onerror = (e) => {
                    console.error(`Core Clear Error (${storeName}):`, e.target.error);
                    reject(e.target.error);
                };
            } catch (err) {
                console.error("Core Transaction Error (Clear):", err);
                reject(err);
            }
        });
    },
    // １件削除
    async deleteByKey(storeName, key) {
        return new Promise((resolve, reject) => {
            try {
                const store = this._getStore(storeName, this.TRANSACTION_MODES.READWRITE);
                const request = store.delete(key);
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => reject(e.target.error);
            } catch (err) {
                console.error("Core DeleteByKey Error:", err);
                reject(err);
            }
        });
    },
    // データ件数取得
    async getCount(storeName) {
        return new Promise((resolve, reject) => {
            const store = this._getStore(storeName, this.TRANSACTION_MODES.READONLY);
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }
};

// 窓口
const LocalDbController = {
    // ※※※※ データベースを削除する ※※※※
    RemoveDB(){
        // 基本的にコメントアウト
        _LocalDbCore.__deleteAllDatabases();
    },
    // 初期化
    async Init() {
        await _LocalDbCore.init();
    },
    // 明細管理
    Detail: {
        storeName: _LocalDbCore.STORE_NAMES.DETAIL,
        // データ保存（成否が返却、「dbid」が付与される）
        async Save(detail) {
            // 念のため、ここでも dbid が 0 なら削除して自動採番を促す
            if (detail.hasOwnProperty('dbid') && (detail.dbid === 0 || detail.dbid === null)) {
                delete detail.dbid;
            }
            detail.send_flag = 0;
            detail.user_id = getUserId();
            return await _LocalDbCore.upsertData(this.storeName, detail);
        },
        // 現在のユーザーの全データを送信対象（フラグ1）に更新
        async SetSendFlg() {
            const uid = getUserId();
            return await _LocalDbCore.updateAll(this.storeName, (item) => {
                if (item.user_id === uid) item.send_flag = 1;
                return item;
            });
        },
        // 送信完了済みデータ（フラグ1）のみ一括削除
        async DeleteSentAll() {
            const uid = getUserId();
            return await _LocalDbCore.deleteByFilter(this.storeName, (item) => item.user_id === uid && item.send_flag === 1);
        },
        // ログイン中のユーザーのデータを全件削除
        async DeleteAll() { 
            const uid = getUserId();
            return await _LocalDbCore.deleteByFilter(this.storeName, (item) => item.user_id === uid);
        },
        // １件削除
        async DeleteById(dbid) { 
            return await _LocalDbCore.deleteByKey(this.storeName, dbid); 
        },
        // ログイン中のユーザーの件数取得
        async GetCount() { 
            const uid = getUserId();
            const all = await _LocalDbCore.getAllData(this.storeName);
            return all.filter(item => item.user_id === uid).length;
        },
        // ログイン中のユーザーの全件取得
        async GetAll() { 
            const uid = getUserId();
            const all = await _LocalDbCore.getAllData(this.storeName);
            return all.filter(item => item.user_id === uid);
        },
        // 保存処理失敗時
        async RevertSendFlg() {
            const uid = getUserId();
            return await _LocalDbCore.updateAll(this.storeName, (item) => {
                if (item.user_id === uid && item.send_flag === 1) item.send_flag = 0;
                return item;
            });
        },
    },
    // リアクション管理
    Reaction: {
        storeName: _LocalDbCore.STORE_NAMES.REACTION,
        // 保存（1seq=1レコード形式をUpsert）
        async Save(reactionData) {
            if (reactionData.send_flag === undefined) reactionData.send_flag = 0;
            reactionData.user_id = getUserId();
            return await _LocalDbCore.upsertData(this.storeName, reactionData);
        },
        // 特定の明細のリアクションを取得
        async Get(archiveId, seq) {
            return await _LocalDbCore.getDataByKey(this.storeName, [getUserId(), Number(archiveId), Number(seq)]);
        },
        // 未送信(send_flag = 0)のものを全取得
        async GetUnsentAll() {
            const uid = getUserId();
            const all = await _LocalDbCore.getAllData(this.storeName);
            return all.filter(item => item.user_id === uid && item.send_flag === 0);
        },
        // local-db-controller.js -> Reaction.ParseAndSaveMyReactions を改修
        async ParseAndSaveMyReactions(archiveId, rawReactions, allDetails = []) {
            if (!archiveId) return;
            const targetArchiveId = Number(archiveId);
            const uid = getUserId();
            // 1. ローカルの未送信(send_flag === 0)リストを取得（保護対象）
            const unsentList = await this.GetUnsentAll();
            const unsentSeqs = unsentList
                .filter(r => r.archive_id === targetArchiveId)
                .map(r => r.seq);
            // 2. サーバーからの集約済みデータを保持
            const aggregated = {};
            rawReactions.forEach(raw => {
                const seq = Number(raw.seq);
                aggregated[seq] = {
                    user_id: uid,
                    archive_id: targetArchiveId,
                    seq: seq,
                    has_funny: !!raw.has_funny,
                    has_love: !!raw.has_love,
                    has_surprise: !!raw.has_surprise,
                    has_sad: !!raw.has_sad,
                    send_flag: 1 // 同期済み
                };
            });
            // 3. リアクションがない明細についても、空のレコード枠を作成（UIの初期化用）
            allDetails.forEach(detail => {
                const seq = Number(detail.seq);
                if (!aggregated[seq]) {
                    aggregated[seq] = this._createEmptyReaction(targetArchiveId, seq, 1);
                }
            });
            // 4. 未送信(send_flag=0)があるseqを除外し、一括Upsert
            const promises = Object.values(aggregated).map(data => {
                if (unsentSeqs.includes(data.seq)) return Promise.resolve();
                return this.Save(data);
            });
            await Promise.all(promises);
        },
        // 共通パーツの定義（has_ への変更を確定）
        _createEmptyReaction(archiveId, seq, sendFlag = 0) {
            return {
                user_id: getUserId(),
                archive_id: archiveId,
                seq: seq,
                has_funny: false,
                has_love: false,
                has_surprise: false,
                has_sad: false,
                send_flag: sendFlag
            };
        },
        // ヘルパー：空のリアクションオブジェクト生成
        _createEmptyReaction(archiveId, seq, sendFlag = 0) {
            return {
                user_id: getUserId(),
                archive_id: archiveId,
                seq: seq,
                has_funny: false,
                has_love: false,
                has_surprise: false,
                has_sad: false,
                send_flag: sendFlag
            };
        },
        // 不要なデータを削除
        async Cleanup(currentArchiveId) {
            const uid = getUserId();
            const targetId = Number(currentArchiveId);
            // 「自分以外のまとめ」かつ「送信済み(send_flag != 0)」のデータを削除
            return await _LocalDbCore.deleteByFilter(this.storeName, (item) => {
                return item.user_id === uid && 
                    item.archive_id !== targetId && 
                    item.send_flag !== 0;
            });
        },
    },
    // システム通知の既読履歴管理
    Notice: {
        storeName: _LocalDbCore.STORE_NAMES.NOTICE,
        // 既読履歴の保存（詳細を開いた時に呼ぶ）
        async Save(seq, update_tim, disp_to) {
            const data = {
                user_id: getUserId(),
                seq: Number(seq),
                update_tim: update_tim,
                disp_to: disp_to
            };
            return await _LocalDbCore.upsertData(this.storeName, data);
        },
        // 全件取得（一覧を開いた時の突合用）
        async GetAll() {
            const uid = getUserId();
            const all = await _LocalDbCore.getAllData(this.storeName);
            return all.filter(item => item.user_id === uid);
        },
        // 期限切れデータのクリーンアップ（一覧を開いた時などに呼ぶ）
        async Cleanup() {
            const now = new Date();
            const uid = getUserId();
            return await _LocalDbCore.deleteByFilter(this.storeName, (item) => {
                if (item.user_id !== uid) return false;
                if (!item.disp_to) return false;
                const toDate = new Date(item.disp_to);
                return now > toDate; // 現在時刻が disp_to を過ぎていれば削除対象
            });
        }
    },
    // ユーザ当て通知の既読履歴管理
    Mail: {
        storeName: _LocalDbCore.STORE_NAMES.MAIL,
        async Save(seq, send_tim) {
            return await _LocalDbCore.upsertData(this.storeName, { 
                user_id: getUserId(), 
                seq: Number(seq), 
                send_tim: send_tim 
            });
        },
        async GetAll() { 
            const uid = getUserId();
            const all = await _LocalDbCore.getAllData(this.storeName); 
            return all.filter(item => item.user_id === uid);
        }
    },
    // リーガル情報管理
    Legal: {
        storeName: _LocalDbCore.STORE_NAMES.LEGAL,
        // 保存：本文、日時、および未読フラグをセット
        async Save(id, body, update_tim, isUnread = false) {
            return await _LocalDbCore.upsertData(this.storeName, { 
                id, body, update_tim, is_unread: isUnread 
            });
        },
        // 特定の項目を取得
        async Get(id) {
            return await _LocalDbCore.getDataByKey(this.storeName, id);
        },
        // 全項目取得（起動時のAppData復元用）
        async GetAll() {
            return await _LocalDbCore.getAllData(this.storeName);
        },
        // 削除（通常は使わないが作法として）
        async Delete(id) {
            return await _LocalDbCore.deleteByKey(this.storeName, id);
        },
        // すべて既読にする（画面表示時に呼び出す）
        async MarkAllAsRead() {
            return await _LocalDbCore.updateAll(this.storeName, (item) => {
                item.is_unread = false;
                return item;
            });
        },
    },
};

// Public
export default LocalDbController;
