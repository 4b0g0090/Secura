import React, { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client';
import '../components/Home_page.css'
import { useActionData } from 'react-router-dom'
import { clear } from '@testing-library/user-event/dist/clear'
import living_room from '../components/img test/living room.jpg'
import kitchen from './img test/kitchen.jpg'
import frontdoor from '../components/img test/frontdoor.png'

const socket = io('http://localhost:5000', {
  transports: ['websocket'],  // 強制使用 WebSocket 傳輸
  pingTimeout: 60000,  // 設定超時時間
  pingInterval: 25000,  // 設定心跳檢查間隔
});


const Home_page = ({ Username, setUsername }) => {

  const Monitors = [

    {
      Floor: 'Outside',
      areas: [
        { name: 'front door', image: frontdoor },
        { name: 'back door', image: frontdoor }
      ]
    },
    {
      Floor: 'First Floor',
      areas: [
        { name: 'living room', image: living_room },
        { name: 'kitchen', image: kitchen, status: 'offline' }
      ]
    }
  ]


  const [currenttime, setCurrenttime] = useState(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }))

  const [longpressimg, setLongpressimg] = useState(null)

  const [detection_time, setDetection_time] = useState([])

  const [videoSRC, setVideosrc] = useState(null)

  const [error, setError] = useState(null);

  const timeref = useRef(null)

  const setLightstate = (status) => {
    switch (status) {
      case 'offline':
        return 'gray';
      // 當標定區域內有偵測時 給alert 
      case 'alert':
        return 'red';
      default:
        return 'green'
    }
  }

  const handlepressstart = (itemName) => {
    timeref.current = setTimeout(() => {
      setLongpressimg(itemName)
    }, 500)
  }

  const handlepressend = () => {
    clearTimeout(timeref.current)
    setLongpressimg(null);
  };

  //Ckeck is connect !

  socket.on('connect', () => {
    console.log('Connect')
  })

  socket.on('reconnect', (attemptNumber) => {
    console.log(`Reconnected after ${attemptNumber} attempts`);
  });

  socket.on('connect_error', (error) => {
    console.log('Connect_error', error)
  })

  socket.on('disconnect', () => {
    console.log('Disconnect')
  })

  //前端主動請求的，不及時
  //改用WEBSOCKET ,允許雙向通信
  useEffect(() => {
    //Keep listening Flask , complement immediately 
    socket.on('new_detection', (data) => {

      console.log('New detection time received: ', data.time);

      setDetection_time((preTimes) => [...preTimes, data.time]);
    })

    return () => {
      socket.off('new_detection');
    };
    // fetch('http://localhost:5000/record_appear_time')
    //   .then(response => response.json())
    //   .then(data => {
    //     setDetection_time(data.detection_time);  // 假設 API 返回了 detection_time 字段

    //     console.log("Detection times: ", data.detection_times); // 打印獲取的數據
    //   })
    //   .catch(error => {
    //     console.error('Error fetching detection time:', error);
    //   });
  }, []
  );

  useEffect(() => {
    socket.on('new_detection', (data) => {
      console.log('New detection time received: ', data.time);

      // 發送確認回後端
      socket.emit('confirm_frontend_received', { time: data.time });
    });

    return () => {
      socket.off('new_detection');
    };
  }, []);

  useEffect(() => {
    socket.on('response_from_server', (data) => {
      console.log(data.message);  // 打印 'Get it'
    });

    // 清理事件監聽器
    return () => {
      socket.off('response_from_server');
    };
  }, []);

  //Request to get the video
  // const handle_video_click = (filename) => {
  //   fetch(`http://localhost:5000/get_video/${filename}`)
  //   .then(response => response.blob())
  //   .then(blob => {
  //     //轉換成前端可以播放的url
  //     const videoUrl = URL.createObjectURL(blob);
  //     setVideosrc(videoUrl);  // 設置影片 URL，前端可直接播放
  //   })
  //   .catch(error => {
  //     console.error('Error fetching video:', error);
  //   });
  // }

  const handleClick = () => {
    socket.emit('button_clicked', { data: 'Button has been clicked!' });
    console.log('button click , send to the server !')
  };

  useEffect(() => {
    const Timer = setInterval(() => {
      setCurrenttime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }))
    }, 1000)
    return () => clearInterval(Timer)
  }, [])

  const handleopenvideo = (event , formattedTime) => {
    event.preventDefault();  // 防止頁面跳轉

    setVideosrc(`http://localhost:5000/get_video/${formattedTime}.mp4`)

  }


  return (
    <div>
      <div className='Title'>
        <h1 className='username'>
          Hi,{Username}
        </h1>
        <p className='currenttime'>{currenttime}</p>
      </div>
      <div className='realtime_container'>
        <button onClick={handleClick}>check</button>
        <p className='realtime'>Real Time</p>
        <p className='midline01'></p>

        <div className='realtime_area_container'>
          <img src='http://localhost:5000/video_feed' className='realtime'></img>
          <div>
            <h1>Detection Times</h1>
            <ul>
              {detection_time.map((time, index) => {
                //因要轉換成可以撥放影片的格式 所以要replace
                const formattedTime = time.replace(" ", "_").replace(/:/g, "-");
                //這裡要用到return 
                return (
                  <li className='detection_time' key={index}>
                    {/* 這裡onclick要用箭頭函數，才能正確點連結時候才打開，不然他會一直渲染 */}
                    <a href='#' onClick={(event) => handleopenvideo( event , formattedTime)} target="_blank">
                      {time}
                    </a>
                  </li>
                );
              })}
            </ul>
            {videoSRC && (
              <div>
                <video width="400" controls>
                  <source src={videoSRC} type="video/mp4"/>
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

          </div>
          {Monitors.map((floor, index) => (
            <div key={index} className='area'>

              <h2 className='Floor_title' >{floor.Floor}</h2>

              <div className='area_container'>
                {floor.areas.map((area, idx) => (
                  <div key={idx} className='area'>

                    <img
                      src={area.image}
                      className='area_img'
                      style={{
                        filter: longpressimg === area.name ? 'blur(2px)' : 'none',
                        transition: 'filter 0.5s ease'
                      }}
                      onTouchStart={() => handlepressstart(area.name)}
                      onTouchEnd={handlepressend}
                    />

                    <span
                      className='statelight'
                      style={{
                        backgroundColor: setLightstate(area.status),
                        filter: longpressimg === area.name ? 'blur(5px)' : 'none',
                        transition: 'filter 0.5s ease'
                      }}
                    ></span>

                    {longpressimg === area.name && (
                      <div className='area_name'>{area.name}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

export default Home_page
