import {useState} from "react";
import HeadMenu from "../HeadMenu/HeadMenu.tsx";
import RootObjectsListMenu from "../HeadMenu/RootObjectsListMenu.tsx";
import ObjectPageMainContent from "./ObjectPageMainContent.tsx";

function ObjectPage() {
    const [showRootObjectsListMenu, setShowRootObjectsListMenu] = useState(false)

    const handleRootObjectsListMenuClose = () => setShowRootObjectsListMenu(false)
    const toggleRootObjectsListMenuShow = () => setShowRootObjectsListMenu(!showRootObjectsListMenu)


    return (
        <>
            <HeadMenu objectsElementClick={toggleRootObjectsListMenuShow} />
            <RootObjectsListMenu showObjectsMenu={showRootObjectsListMenu} handleClose={handleRootObjectsListMenuClose} />
            <ObjectPageMainContent />
        </>
    );
}

export default ObjectPage;