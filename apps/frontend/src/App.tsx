import { useState,useEffect, useRef, type SubmitEvent } from "react";
import "./index.css";
import { Input } from "./components/ui/input.tsx";
import { Button } from "./components/ui/button.tsx";

// type NotesResponse = {
//     videoId: string;
//     keynotes: string[];
// }

// const apiUrl = process.env.FRONTEND_PORT;

export default function App() {

    return (
        <div>
            <div>
                <h2> YT Keynotes A.I </h2>
            </div>
            <div>
                <Input />
                <Button />
            </div>
        </div>
    );

}