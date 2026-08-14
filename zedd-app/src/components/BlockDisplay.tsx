import { format } from 'date-fns'
import { observer } from 'mobx-react-lite'
import * as React from 'react'
import { useCallback } from 'react'

import { useTheme } from '@mui/material/styles'
import { TimeSlice } from '../AppState'
import { PlatformState } from '../PlatformState'
import { SliceDragStartHandler, SliceSplitHandler } from './Calendar'

export type BlockProps = {
  slice: TimeSlice
  startDrag?: SliceDragStartHandler<TimeSlice>
  showTime?: boolean
  onSplit?: SliceSplitHandler<TimeSlice>
  onContextMenu: (e: React.MouseEvent, block: TimeSlice) => void
  onAltRightClick: (e: React.MouseEvent, block: TimeSlice) => void
  onMarkingBlock: (block: TimeSlice) => void
  platformState: PlatformState
  slicesMarked: boolean
  colorMode: 'hash' | 'hsl'
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onContextMenu'>

export const BlockDisplay = observer(
  ({
    slice,
    slicesMarked,
    onSplit,
    startDrag,
    onContextMenu,
    onAltRightClick,
    onMarkingBlock,
    platformState,
    colorMode,
    style,
    className,
    ...attributes
  }: BlockProps) => {
    const blockClickHandler = useCallback(
      (e: React.MouseEvent) => {
        if ((e.ctrlKey || e.metaKey) && onSplit) onSplit(slice, e)
        if (1 === e.button) onContextMenu(e, slice)
        if (0 === e.button) {
          setMarking((current) => !current)
          onMarkingBlock(slice)
          if (e.altKey === true) onAltRightClick(e, slice)
        }
      },
      [slice, onSplit, onContextMenu],
    )
    const [isMarked, setMarking] = React.useState(false)

    function checkIfMarked(): boolean {
      if (!slicesMarked && isMarked) {
        setMarking((current) => !current)
      }
      return isMarked
    }

    const startHandleHandler = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 0) {
          startDrag!(slice, e, 'start')
        }
      },
      [startDrag, slice],
    )
    const startPrevHandleHandler = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 0) {
          startDrag!(slice, e, 'start+prev')
        }
      },
      [startDrag, slice],
    )
    const endHandleHandler = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 0) {
          startDrag!(slice, e, 'end')
        }
      },
      [startDrag, slice],
    )
    const completeHandleHandler = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 0) {
          startDrag!(slice, e, 'complete')
        }
      },
      [startDrag, slice],
    )

    const task = platformState.resolveTask(slice.task.platformTaskIntId)

    const theme = useTheme()
    const isDark = 'dark' === theme.palette.mode
    const mode = colorMode

    const getBarColor = (marked: boolean): string => {
      const base = slice.task.getColor(mode)
      const color = base.set('hsl.s', 0.9)
      const adjusted = color.set('hsl.l', isDark ? 0.2 : 0.75)
      return marked ? adjusted.darker().css() : adjusted.css()
    }

    return (
      <div
        {...attributes}
        key={slice?.task?.name ?? 'UNDEFINED'}
        className={'block ' + className}
        style={{
          ...style,
          padding: '2px',
          fontSize: 'smaller',
          fontWeight: 200,
          position: 'absolute',
          backgroundColor:
            'task' in slice
              ? checkIfMarked()
                ? getBarColor(true)
                : getBarColor(false)
              : '#eeeeee',
          right: 0,
          left: 20,
          borderRadius: 4,
          boxSizing: 'border-box',
        }}
        // {...hotKeys}
        onClick={blockClickHandler}
        onContextMenu={(e) => onContextMenu(e, slice)}
      >
        {true && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              paddingRight: 2,
              fontSize: '80%',
              color: slice.task.getColor(mode).set('hsl.s', 1).set('hsl.l', 0.38).css(),
            }}
          >
            {format(slice.start, 'HH:mm')} - {format(slice.end, 'HH:mm')}
          </div>
        )}
        {!task && (
          <span title='Task is unset/invalid' style={{ cursor: 'help' }}>
            ⚠️
          </span>
        )}
        {slice.task.name}{' '}
        {task && (
          <span style={{ fontFamily: 'Consolas' }}>
            {task.name}
            {slice.task.platformTaskComment && (
              <span style={{ fontStyle: 'italic' }}>{' mK ' + slice.task.platformTaskComment}</span>
            )}
          </span>
        )}
        {startDrag && (
          <>
            <div className='block-handle bottom-right' onMouseDown={endHandleHandler}></div>
            <div className='block-handle top-left' onMouseDown={startHandleHandler}></div>
            <div className='block-handle top-center' onMouseDown={startPrevHandleHandler}></div>
            <div className='block-handle inside' onMouseDown={completeHandleHandler}></div>
          </>
        )}
      </div>
    )
  },
)
// export const BlockDisplayShortcuts: any = withHotKeys(BlockDisplay as any, {}) as any
