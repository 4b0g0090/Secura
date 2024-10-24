import cv2
import eventlet
from flask_socketio import SocketIO , emit
from flask_cors import CORS
import os
import time
from ultralytics import YOLO
from flask import Flask, Response, jsonify
from flask import send_file
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="torch.distributed")

# 載入模型
model = YOLO('yolov8n-pose.pt')
eventlet.monkey_patch()  # 確保使用 eventlet 來處理異步

#3000與前端連結 , 5000與後端連結

rect_x1 = 0
rect_y1 = 0
rect_x2 = 100
rect_y2 = 100

app = Flask(__name__)

socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins='http://localhost:3000')  # 使用 eventlet 處理 WebSocket 連接

@socketio.on('connect')
def handle_connect():
    print("Client connected")


@socketio.on('button_clicked')
def handle_button_click(data):
    print(f"Received data from front end: {data}")
    # 回傳給前端 'Get it'
    socketio.emit('response_from_server', {'message': 'Get it'})
    with open(record_appear_time_directory, 'a', encoding='utf-8') as f:
        f.write('connect with frontend')

# 啟用 CORS，允許來自 http://localhost:3000 的 HTTP 請求
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# 開啟攝像頭
cap = cv2.VideoCapture(0)

save_directory = "D:/SECURA/save_directory"
record_appear_time_directory = 'D:/SECURA/appear_time.txt'

# 檢查並創建保存影片的目錄
if not os.path.exists(save_directory):
    os.makedirs(save_directory)

# 檢查並創建記錄時間的目錄
if not os.path.exists(os.path.dirname(record_appear_time_directory)):
    os.makedirs(os.path.dirname(record_appear_time_directory))

# Use VideoWriter_fourcc to save video
record = cv2.VideoWriter_fourcc(*'MJPG')
video_writer = None
is_recording = False  # 判別是否在錄影

def start_recording():
    global is_recording, video_writer
    current_time = time.strftime("%Y-%m-%d_%H-%M-%S", time.localtime())
    filename = os.path.join(save_directory, f'{current_time}.avi')
    fps = 20.0  # 設定影片的每秒幀數
    frame_width = int(cap.get(3))  # 取得影片寬度
    frame_height = int(cap.get(4))  # 取得影片高度
    video_writer = cv2.VideoWriter(filename, record, fps, (frame_width, frame_height))
    is_recording = True
    print(f'start recording : {filename}')

def stop_recording():
    global video_writer, is_recording
    if is_recording and video_writer is not None:
        video_writer.release()  # 關閉影片文件
        is_recording = False
        print("Stopped recording and saved video.")



def record_appear_time():
    # 獲取當前時間
    current_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    with open(record_appear_time_directory, 'a', encoding='utf-8') as f:
        f.write(f"Person detected at: {current_time}\n")
    
    socketio.emit('new_detection', {'time': current_time})
    print(f"Detection time logged: {current_time}")


@socketio.on('confirm_frontend_received')
def handle_confirm(data):
    current_time = data.get('time')
    if current_time:
        record_appear_time(current_time)

@app.route('/record_appear_time', methods=['GET'])
def get_appear_time():
    try:
        with open(record_appear_time_directory, 'r', encoding='utf-8') as f:
            times = f.readlines()
        return jsonify({"detection_times": [time.strip() for time in times]})
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    

#The API is to provide deteced video 
# @app.route('/get_video/<time_str>' , methods = ['GET'])
# def get_video(time_str):
#     filename = f'test_{time_str}.avi'
#     video_path = os.path.join(save_directory, filename)
#     try:
#         return send_file(video_path, mimetype='video/x-msvideo')
#     except Exception as e:
#         return jsonify({"error": str(e)}), 404

def generate_frame():
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # 畫出矩形區域
        cv2.rectangle(frame, (rect_x1, rect_y1), (rect_x2, rect_y2), (255, 0, 0), 2)

        # 進行物體偵測
        results = model(frame)

        person_detected = False
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                label = result.names[int(box.cls[0])]
                confidence = box.conf[0]

                color = (0, 255, 0)

                if label == 'person':
                    if not (x2 < rect_x1 or x1 > rect_x2 or y2 < rect_y1 or y1 > rect_y2):
                        color = (0, 0, 255)
                        print('alert')
                        if not is_recording:
                            start_recording()
                            record_appear_time()

                        person_detected = True

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f'{label} {confidence:.2f}', (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)

        if is_recording:
            video_writer.write(frame)

        if not person_detected and is_recording:
            stop_recording()

        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frame(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/get_video/<time_str>' , methods=['GET'])
def get_video(time_str):
    filename  = f'{time_str}.avi'
    video_path = os.path.join(save_directory , filename)
    try:
        return send_file(video_path, mimetype='video/x-msvideo')
    except Exception as e:
        return jsonify({"error": str(e)}), 404


if __name__ == "__main__":
    try:
        socketio.run(app, host='0.0.0.0', port=5000)
    finally:
        if is_recording and video_writer is not None:
            video_writer.release()
        cap.release()
        cv2.destroyAllWindows()
