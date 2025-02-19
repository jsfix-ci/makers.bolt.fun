import { useEffect, useRef, useState } from 'react'
import { Controller, useFormContext } from "react-hook-form";
import Button from "src/Components/Button/Button";
import TagsInput from "src/Components/Inputs/TagsInput/TagsInput";
import ContentEditor from "../ContentEditor/ContentEditor";
import { useCreateStoryMutation } from 'src/graphql'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, } from 'src/utils/hooks';
import { stageStory } from 'src/redux/features/staging.slice'
import { NotificationsService } from "src/services/notifications.service";
import { createRoute } from 'src/utils/routing';
import PreviewPostCard from '../PreviewPostCard/PreviewPostCard'
import { StorageService } from 'src/services';
import { useThrottledCallback } from '@react-hookz/web';
import { CreateStoryType } from '../../CreateStoryPage/CreateStoryPage';
import CoverImageInput from 'src/Components/Inputs/FilesInputs/CoverImageInput/CoverImageInput';
import TagProjectInput from '../TagProjectInput/TagProjectInput';
import { extractErrorMessage } from 'src/utils/helperFunctions';

interface Props {
    isUpdating?: boolean;
    isPublished?: boolean;
    onSuccess?: (isDraft: boolean) => void,
    onValidationError?: () => void
}

const storageService = new StorageService<CreateStoryType>('story-edit');

export default function StoryForm(props: Props) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { handleSubmit, control, register, trigger, getValues, watch, reset } = useFormContext<CreateStoryType>();


    const [editMode, setEditMode] = useState(true)
    const [loading, setLoading] = useState(false);
    const titleInputRef = useRef<HTMLTextAreaElement | null>(null)


    const presistPost = useThrottledCallback((value) => storageService.set(value), [], 1000)
    useEffect(() => {
        if (!props.isUpdating) {
            const subscription = watch(({ id, is_published, ...values }) => presistPost(values));
            return () => subscription.unsubscribe();
        }
    }, [presistPost, props.isUpdating, watch]);

    useEffect(() => {
        if (editMode)
            setTimeout(() => titleInputRef.current?.setAttribute("style", "height:" + (titleInputRef.current.scrollHeight) + "px;overflow-y:hidden;"), 0)
    }, [editMode])



    const clickPreview = async () => {
        const isValid = await trigger();

        if (isValid) {
            const data = getValues()
            dispatch(stageStory(data))
            setEditMode(false);
        } else {
            clickSubmit(false)(); // I'm doing this so that the react-hook-form attaches onChange listener to inputs validation
        }
    }


    const [createStory] = useCreateStoryMutation({
        onCompleted: (data) => {
            reset()
            storageService.clear();
            setLoading(false)
            dispatch(stageStory(null))
            if (data.createStory?.is_published)
                navigate(createRoute({ type: 'story', id: data.createStory?.id!, title: data.createStory?.title }))
            props.onSuccess?.(!!data.createStory?.is_published);
        },
        onError: (error) => {
            NotificationsService.error(extractErrorMessage(error) ?? 'Unexpected error happened, please try again', { error })
            setLoading(false)
        },
        refetchQueries: ['GetMyDrafts']
    });

    const clickSubmit = (publish_now: boolean) => handleSubmit<CreateStoryType>(data => {
        setLoading(true);
        createStory({
            variables: {
                data: {
                    id: data.id,
                    title: data.title,
                    body: data.body,
                    tags: data.tags.map(t => t.title),
                    is_published: publish_now,
                    cover_image: data.cover_image,
                    project_id: data.project?.id,
                },
            }
        })
    }, props.onValidationError);




    const postId = watch('id') ?? -1;
    const { ref: registerTitleRef, ...titleRegisteration } = register('title');




    return (
        <>
            <div id='preview-switch' className="flex gap-16">
                <button type='button' className={`rounded-8 px-16 py-8 ${editMode ? 'bg-primary-100 text-primary-700' : "text-gray-500"} active:scale-95 transition-transform`} onClick={() => setEditMode(true)}>Edit</button>
                <button type='button' className={`rounded-8 px-16 py-8 ${!editMode ? 'bg-primary-100 text-primary-700' : "text-gray-500"} active:scale-95 transition-transform`} onClick={clickPreview}>Preview</button>
            </div>
            <form
                id='form'
                onSubmit={clickSubmit(true)}
            >
                {editMode && <>
                    <div
                        className='bg-white border-2 border-gray-200 rounded-16 overflow-hidden'>
                        <div className="p-16 md:p-24 lg:p-32">
                            <div className="w-full h-[120px] md:h-[240px] rounded-12 mb-16 overflow-hidden">
                                <Controller
                                    control={control}
                                    name="cover_image"
                                    render={({ field: { onChange, value, onBlur, ref } }) => <CoverImageInput
                                        value={value}
                                        onChange={e => {
                                            onChange(e)
                                        }}
                                    // uploadText='Add a cover image'
                                    />

                                    }
                                />
                            </div>



                            <div className="mt-16 relative">
                                <textarea
                                    rows={1}
                                    autoFocus
                                    className="p-0 text-[42px] leading-[58px] border-0 w-full max-w-full resize-none
                                focus:border-0 focus:outline-none focus:ring-0 font-bolder placeholder:!text-gray-400"
                                    placeholder='New story title here...'
                                    {...titleRegisteration}
                                    ref={e => {
                                        registerTitleRef(e);
                                        titleInputRef.current = e;
                                    }}
                                    onInput={() => {
                                        if (!titleInputRef.current) return;
                                        titleInputRef.current.style.height = "auto";
                                        titleInputRef.current.style.height = (titleInputRef.current.scrollHeight) + "px";
                                    }}
                                />
                            </div>

                            <Controller
                                control={control}
                                name="tags"
                                render={({ field: { onChange, value, onBlur } }) => (
                                    <TagsInput
                                        placeholder="Add up to 5 popular tags..."
                                        classes={{ container: 'mt-16' }}
                                        value={value}
                                        onChange={onChange}
                                        onBlur={onBlur}
                                    />
                                )}
                            />

                            <Controller
                                control={control}
                                name="project"
                                render={({ field: { onChange, value, onBlur } }) => (
                                    <TagProjectInput
                                        classes={{ container: 'mt-16' }}
                                        value={value}
                                        onChange={onChange}
                                        onBlur={onBlur} />
                                )}
                            />


                        </div>
                        <ContentEditor
                            key={postId}
                            initialContent={() => getValues().body}
                            placeholder="Write your story content here..."
                            name="body"
                        />
                    </div>
                </>}
                {!editMode && <PreviewPostCard post={{ ...getValues(), cover_image: getValues('cover_image.url') }} />}
                <div className="flex gap-16 mt-32">
                    <Button
                        type='submit'
                        color="primary"
                        disabled={loading}
                    >
                        {props.isUpdating ?
                            (loading ? "Updating..." : "Update") :
                            (loading ? "Publishing..." : "Publish")
                        }
                    </Button>
                    {!props.isPublished &&
                        <Button
                            color="gray"
                            disabled={loading}
                            onClick={clickSubmit(false)}
                        >
                            Save as Draft
                        </Button>}
                </div>
            </form>
        </>
    )
}
