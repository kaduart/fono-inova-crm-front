/* import dayjs from "dayjs";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { IDoctor } from "../../utils/types";

interface AvailableDayCardProps {
    date: string;
    times: string[];
    selectedDoctor: IDoctor;
    onSelectSlot: (booking: {
        doctorId: string;
        date: string;
        time: string;
    }) => void;
}

export const AvailableDayCard = ({
    date,
    times,
    selectedDoctor,
    onSelectSlot,
}: AvailableDayCardProps) => {
    const [expanded, setExpanded] = useState(false);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    const toggle = () => setExpanded(!expanded);

    const handleTimeClick = (time: string) => {
        setSelectedTime(time);
    };

    const formattedDate = dayjs(date).format('dddd - DD/MM/YYYY');

    return (
        <div className="border rounded-xl shadow-sm bg-white mb-4 transition-all duration-300">
            <div
                className={`flex justify-between items-center px-4 py-3 cursor-pointer rounded-t-xl ${expanded ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                onClick={toggle}
            >
                <div>
                    <h3 className="text-lg font-semibold capitalize">{formattedDate}</h3>
                    <p className="text-sm text-gray-600">
                        {selectedDoctor.fullName} – {times.length} horário(s) disponível(is)
                    </p>
                </div>
                {expanded ? <ChevronUp /> : <ChevronDown />}
            </div>

            {expanded && (
                <div className="px-4 py-3">
                    <p className="text-sm text-gray-700 mb-2">Selecione um horário:</p>
                    <div className="flex flex-wrap gap-2">
                        {times.map((time) => (
                            <button
                                key={time}
                                className="px-3 py-1 bg-blue-50 hover:bg-blue-200 text-sm rounded-lg border border-blue-300 transition-all"
                                onClick={() => handleTimeClick(time)}
                            >
                                {time}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
 */