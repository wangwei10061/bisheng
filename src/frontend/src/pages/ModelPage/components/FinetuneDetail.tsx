import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { bsconfirm } from "../../../alerts/confirm";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import EditLabel from "../../../components/ui/editLabel";
import { alertContext } from "../../../contexts/alertContext";
import { cancelTaskApi, getTaskInfoApi, publishTaskApi, unPublishTaskApi, updataTaskNameApi } from "../../../controllers/API/finetune";
import { captureAndAlertRequestErrorHoc } from "../../../controllers/request";
import { TaskDB } from "../../../types/api/finetune";
import FinetuneResult from "./FinetuneResult";

export const enum TaskStatus {
    TRAINING_IN_PROGRESS = 1,
    TRAINING_FAILED,
    TASK_ABORTED,
    TRAIN_SUCCESS,
    PUBLISH_SUCCESS
}

// 徽章
export const BadgeView = ({ value }) => {
    const { t } = useTranslation()
    // 训练成功
    // return null
    const colors = ['', '', 'text-red-500', '', 'text-green-500', 'text-green-500']
    const texts = ['', t('finetune.trainingInProgress'), t('finetune.trainingFailed'), t('finetune.taskAborted'), t('finetune.trainingSuccess'), t('finetune.publishSuccess')]
    return <Badge size="sm" variant="secondary" className={`${colors[value]} break-keep`}>{texts[value]}</Badge>
}

const HeadButtonView = ({ name, status, online, onPublish, onUnPublish, onDelete, onStop }) => {
    const { t } = useTranslation()

    const cancelPublish = () => {
        online ? bsconfirm({
            desc: t('finetune.confirmCancelPublish'),
            onOk(next) {
                onUnPublish()
                next()
            }
        }) : onUnPublish()
    }

    const deleteClick = () => {
        let tip = t('finetune.confirmDeleteModel', { name })
        if (online) {
            tip = t('finetune.confirmDeleteOnlineModel', { name })
        } else if (status === TaskStatus.PUBLISH_SUCCESS) {
            tip = t('finetune.confirmDeletePublishedModel', { name })
        }
        bsconfirm({
            desc: tip,
            onOk(next) {
                onDelete()
                next()
            }
        })
    }

    const stopClick = () => {
        bsconfirm({
            desc: t('finetune.confirmStopTraining'),
            onOk(next) {
                onStop()
                next()
            }
        })
    }

    return <div className="absolute right-4 flex gap-4">
        {status === TaskStatus.PUBLISH_SUCCESS ?
            <Button size="sm" className="rounded-full h-7" onClick={cancelPublish}>{t('finetune.cancelPublish')}</Button> :
            status === TaskStatus.TRAIN_SUCCESS ?
                <Button size="sm" className="rounded-full h-7" onClick={onPublish}>{t('finetune.publish')}</Button> : null
        }
        {status === TaskStatus.TRAINING_IN_PROGRESS ?
            <Button size="sm" className="rounded-full h-7 bg-red-400 hover:bg-red-500" onClick={stopClick}>{t('finetune.stop')}</Button> :
            <Button size="sm" className="rounded-full h-7 bg-red-400 hover:bg-red-500" onClick={deleteClick}>{t('delete')}</Button>
        }
    </div>
}




export default function FinetuneDetail({ id, onDelete, onStatusChange }) {
    const { t } = useTranslation()

    const { setSuccessData } = useContext(alertContext);

    const [baseInfo, setBaseInfo] = useState<TaskDB>(null)


    useEffect(() => {
        getTaskInfoApi(id).then((data) => {
            setBaseInfo(data.finetune)
        })
    }, [id])

    const handlePublish = async () => {
        const res = await captureAndAlertRequestErrorHoc(publishTaskApi(id))
        if (!res) return
        // 成功
        onStatusChange(TaskStatus.PUBLISH_SUCCESS)
        setBaseInfo({ ...baseInfo, status: TaskStatus.PUBLISH_SUCCESS })
        setSuccessData({ title: t('finetune.publishSuccess') })
    }

    const handleUnPublish = async () => {
        const res = await captureAndAlertRequestErrorHoc(unPublishTaskApi(id))
        if (!res) return
        onStatusChange(TaskStatus.TRAIN_SUCCESS)
        setBaseInfo({ ...baseInfo, status: TaskStatus.TRAIN_SUCCESS })
    }

    const handleStopTrain = async () => {
        const res = await captureAndAlertRequestErrorHoc(cancelTaskApi(id))
        if (!res) return

        onStatusChange(TaskStatus.TASK_ABORTED)
        return setBaseInfo({ ...baseInfo, status: TaskStatus.TASK_ABORTED })
    }

    const handleChangeName = async (name) => {
        const res = await captureAndAlertRequestErrorHoc(updataTaskNameApi(id, name))
        if (!res) return

        onStatusChange(baseInfo.status)
        setBaseInfo({ ...baseInfo, model_name: name })
    }

    if (!baseInfo) return <></>

    return <div>
        {/* <div>选择模型已查看详情</div> */}
        <HeadButtonView
            name={baseInfo.model_name}
            status={baseInfo.status}
            online={false}
            onPublish={handlePublish}
            onUnPublish={handleUnPublish}
            onDelete={onDelete}
            onStop={handleStopTrain}
        ></HeadButtonView>
        <div className="border-b pb-4">
            <div className="flex gap-4 items-center">
                <EditLabel
                    rule={[
                        {
                            pattern: /^[a-zA-Z0-9-_]{1,50}$/,
                            message: t('finetune.fillName'),
                        }
                    ]}
                    str={baseInfo.model_name}
                    onChange={(model_name) => handleChangeName(model_name)}>
                    {(val) => <div className="text-lg font-semibold">{val}</div>}
                </EditLabel>
                <BadgeView value={baseInfo.status} />
            </div>
            <div className="flex gap-4 mt-4">
                <small className="text-sm font-medium leading-none text-gray-500">{t('finetune.taskId')}</small>
                <small className="text-sm font-medium leading-none text-gray-700">{baseInfo.id}</small>
            </div>
            <div className="flex gap-4 mt-4">
                <small className="text-sm font-medium leading-none text-gray-500">{t('finetune.baseModel')}</small>
                <small className="text-sm font-medium leading-none text-gray-700">{baseInfo.base_model_name}</small>
            </div>
        </div>
        <div className="border-b pb-4">
            <div className="flex gap-4 mt-4">
                <small className="text-sm font-medium leading-none text-gray-500">{t('finetune.createTime')}</small>
                <small className="text-sm font-medium leading-none text-gray-700">{baseInfo.create_time.replace('T', ' ')}</small>
            </div>
            <div className="flex gap-4 mt-4">
                <small className="text-sm font-medium leading-none text-gray-500">{t('finetune.runtime')}</small>
                <small className="text-sm font-medium leading-none text-gray-700">{TaskStatus.TRAINING_IN_PROGRESS === baseInfo.status ? '--' : baseInfo.report?.train_runtime || 0}</small>
            </div>
            <div className="flex gap-4 mt-4">
                <small className="text-sm font-medium leading-none text-gray-500">{t('finetune.creator')}</small>
                <small className="text-sm font-medium leading-none text-gray-700">{baseInfo.user_name}</small>
            </div>
        </div>
        <div className="border-b pb-4">
            <div className="flex gap-4 mt-4">
                <small className="text-sm font-medium leading-none text-gray-500">{t('finetune.dataset')}</small>
                <small className="text-sm font-medium leading-none text-gray-700">{
                    baseInfo.preset_data.concat(baseInfo.train_data).map(el => el.name).join(',')
                }</small>
            </div>
        </div>
        <FinetuneResult id={id} training={TaskStatus.TRAINING_IN_PROGRESS === baseInfo.status} failed={TaskStatus.TRAINING_FAILED === baseInfo.status}></FinetuneResult>
    </div>
};
