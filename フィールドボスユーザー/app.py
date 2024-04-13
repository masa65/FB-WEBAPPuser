from flask import Flask, render_template, request, jsonify
import firebase_admin
from firebase_admin import credentials, firestore, messaging
from datetime import datetime, timezone
import dateutil.parser
from flask import send_from_directory
import dateutil.parser
from datetime import datetime, timedelta
import pytz

# Firebase Admin SDKの初期化
app = Flask(__name__)
app.secret_key = 'your_secret_key'

# Firebase Admin SDKの初期化
cred_path = "fbnotification-system-firebase-adminsdk-krzod-feb3ede3e9.json"
cred = credentials.Certificate(cred_path)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

# Firebase Cloud Messaging（FCM）を使用して通知を受信するための初期化
firebase_messaging = firebase_admin.messaging

# 登録されたトークンを保存するグローバル変数
# ユーザーIDをキーとし、トークンのリストを値とする辞書に変更
registered_tokens = {}

@app.route('/chat')
def chat():
    return render_template('chat.html')  # chat.htmlは新しく作成するチャットページのテンプレート


@app.route('/')
def index():
    notifications_query = db.collection('notifications').order_by('timestamp',
                                                                  direction=firestore.Query.DESCENDING).stream()
    notifications = []
    for doc in notifications_query:
        doc_dict = doc.to_dict()
        timestamp = doc_dict.get('timestamp')

        # timestampが文字列であることを前提に、dateutil.parser.parseを使用して解析
        if isinstance(timestamp, str):
            try:
                # 文字列をdatetimeオブジェクトに変換
                parsed_timestamp = dateutil.parser.parse(timestamp)
                formatted_timestamp = parsed_timestamp.strftime('%Y-%m-%d %H:%M:%S')
            except ValueError:
                # 文字列が解析できない形式の場合はエラーハンドリング
                formatted_timestamp = '不明な日付'
        else:
            # timestampが想定外の型の場合のフォールバック
            formatted_timestamp = '不明な日付'

        notifications.append({
            'message': doc_dict.get('message'),
            'timestamp': formatted_timestamp,
            'user_id': doc_dict.get('user_id')
        })

    return render_template('index.html', notifications=notifications)

@app.route('/register-token', methods=['POST'])
def register_token():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        token = data.get('token')

        if not user_id or not token:
            return jsonify({'error': 'User ID or Token is missing'}), 400

        # Firebase FirestoreにユーザーIDとトークンを保存
        db.collection('user_tokens').document(user_id).set({'token': token})
        return jsonify({'success': True}), 200
    except Exception as e:
        print(e)
        return jsonify({'error': 'Server error'}), 500




@app.route('/tokens')
def get_tokens():
    tokens_query = db.collection('user_tokens').stream()
    tokens = {doc.id: doc.to_dict() for doc in tokens_query}
    return jsonify(tokens)
@app.route('/receive_message', methods=['POST'])
def receive_message():
    data = request.get_json()
    message_text = data['message']
    print("Received data:", data)  # デバッグ用のログ出力

    # 現在の日本時間を取得してISO形式に変換
    timestamp_jst = datetime.now(pytz.timezone('Asia/Tokyo')).isoformat()

    # Firestoreにデータを保存
    db.collection('notifications').add({
        'user_id': data['user_id'],
        'message': message_text,
        'timestamp': timestamp_jst
    })

    # 登録された全トークンにプッシュ通知を送信
    for user_id, tokens in registered_tokens.items():
        for token in tokens:
            message = messaging.Message(
                notification=messaging.Notification(
                    title='新しいフィールドボス通知',
                    body=message_text
                ),
                token=token,
            )
            response = messaging.send(message)
            print(f"プッシュ通知を送信しました: {response}")

    return jsonify({'success': True}), 200

@app.route('/firebase-messaging-sw.js')
def service_worker():
    return send_from_directory(app.root_path, 'firebase-messaging-sw.js')

@app.route('/check-username', methods=['POST'])
def check_username():
    data = request.get_json()
    username = data['username']
    try:
        user_doc = db.collection('user_tokens').document(username).get()
        if user_doc.exists:
            return jsonify({'error': 'すでに使われているIDです'}), 409
        else:
            return jsonify({'success': '使用可能なIDです'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/notifications')
def notifications():
    # 現在の日本時間から1週間前の日付を計算
    one_week_ago = datetime.now(pytz.timezone('Asia/Tokyo')) - timedelta(days=7)

    # Firestoreから過去1週間の通知だけを取得
    notifications_query = db.collection('notifications')\
                             .where('timestamp', '>=', one_week_ago)\
                             .order_by('timestamp', direction=firestore.Query.DESCENDING)\
                             .stream()

    notifications = []
    for doc in notifications_query:
        doc_dict = doc.to_dict()
        timestamp = doc_dict.get('timestamp')

        # Firestoreのtimestampがdatetimeオブジェクトであるか確認し、適切に処理
        if isinstance(timestamp, datetime):
            # タイムゾーンの変換を実施
            parsed_timestamp = timestamp.astimezone(pytz.timezone('Asia/Tokyo'))
            # フォーマットされたタイムスタンプを取得
            formatted_timestamp = parsed_timestamp.strftime('%Y-%m-%d %H:%M:%S')
        else:
            # timestampが想定外の型の場合はフォールバック
            formatted_timestamp = '不明な日付'

        notifications.append({
            'message': doc_dict.get('message'),
            'timestamp': formatted_timestamp,
            'user_id': doc_dict.get('user_id')
        })

    return render_template('notifications.html', notifications=notifications)

if __name__ == '__main__':
    app.run(debug=True, port=5001)







