import React, { useState, useEffect } from 'react'
import '../components/Login_page.css'
import camera from '../ui_icons/camera.png'
import login from '../ui_icons/login.png'
import { useNavigate } from 'react-router-dom';




const Login_page = ({Username, setUsername}) => {

    const Nevigate = useNavigate()

    const [isLoadanimation, setIsloadanimation] = useState(false)

    useEffect(() => {

        const time = setTimeout(() => {
            setIsloadanimation(true)
        },1500);
        return () => clearTimeout(time)
    } , [])

    const btn_to_home_page = () => {
        Nevigate('/home_page')
        console.log(Username)
    }

    const handle_user_name = (event) => {
        setUsername(event.target.value)
    }
    
    

    return (
        <div>
            <div className='Title'>
                <h1 className='title_name'>Secura</h1>
                <h2 className='login_text'>log in</h2>
            </div>
            <div className='login_input'>
                <input className='input_username' value={Username} onChange={handle_user_name}></input>
                <input className='input_password'></input>
                <button className='btn_login' onClick={btn_to_home_page}><img src={login} className='login_icon'></img></button>
            </div>

            <div className={`loadanimation_container ${isLoadanimation ?'loaded' : ''}`}>
                <div className='camera_icon'><img className='camera' src={camera}></img></div>
            </div>

        </div>
    )
}

export default Login_page
